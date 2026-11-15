"""주문 / 구매 API

용어
  주문 = 결제 전의 한시적 상태(PENDING), 구매 = 결제 완료(PAID). 환불(REFUNDED)은 구매가 아니다.
  이 파일의 POST /orders 는 주문과 결제를 한 트랜잭션으로 처리한다.  → 바로 PAID (구매)
  (실제 결제 연동은 하지 않는다. 환불은 관리자 API : POST /admin/orders/{id}/refund)

모든 API 는 로그인(Authorization: Bearer 토큰)이 필요하고, 구매자는 로그인한 사용자다.
배송지는 주문 시점의 값을 orders 에 복사해 저장한다. (회원이 나중에 바꿔도 지난 주문은 그대로)
"""
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth import get_current_user
from .address import save_address
from .database import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(tags=["orders"])


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)          # 가격은 받지 않는다. 서버가 DB 에서 읽는다.


class ShippingIn(BaseModel):
    receiver_name: str = Field(min_length=1, max_length=50)       # 받는 사람
    receiver_phone: str = Field(pattern=r"^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$")   # 연락처
    zipcode: str = Field(pattern=r"^[0-9]{5}$")                   # 우편번호 (다음 주소 검색)
    address: str = Field(min_length=5, max_length=255)            # 주소 (다음 주소 검색 결과)
    address_detail: str | None = Field(None, max_length=100)      # 상세주소 (동, 호수 등)
    request_memo: str | None = Field(None, max_length=100)        # 배송 요청사항 (선택)
    save_address: bool = True                                     # 이 배송지를 내 배송지로 저장


class OrderIn(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    shipping: ShippingIn


# -----------------------------------------------------------------------------
# POST /orders : 장바구니의 여러 상품을 한 번에 구매 (주문 + 결제)
#   하나라도 실패하면 전체를 되돌린다 (rollback).
# -----------------------------------------------------------------------------
@router.post("/orders", status_code=201)
def create_order(body: OrderIn, user: dict = Depends(get_current_user)):
    # 같은 상품이 여러 줄이면 수량을 합친다. id 순으로 처리해 동시 주문 때 교착(deadlock)을 줄인다.
    wanted: dict[int, int] = {}
    for it in body.items:
        wanted[it.product_id] = wanted.get(it.product_id, 0) + it.quantity
    if any(q > 99 for q in wanted.values()):
        raise HTTPException(status_code=422, detail="상품당 수량은 99개까지입니다.")

    ship = body.shipping
    receiver_name = ship.receiver_name.strip()
    address = ship.address.strip()
    address_detail = (ship.address_detail or "").strip() or None
    if not receiver_name or not address:
        raise HTTPException(status_code=422, detail="받는 사람과 주소를 입력해 주세요.")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            lines, total = [], 0
            for pid in sorted(wanted):
                qty = wanted[pid]
                # FOR UPDATE : 이 상품 행을 잠그고 "최신 값" 을 읽는다. 같은 상품을 동시에 주문하는 다른 요청은
                #   이 주문이 끝날 때까지 기다린다. (잠그지 않고 읽으면 MariaDB 11.6+ 에서는 동시 주문 때
                #   "Record has changed since last read" 오류가 나서 재고 부족(409) 대신 서버 오류(500)가 된다)
                cur.execute("SELECT id, name, price FROM products WHERE id = %s AND is_active = 1 FOR UPDATE", (pid,))
                p = cur.fetchone()
                if p is None:
                    raise HTTPException(status_code=404, detail=f"상품을 찾을 수 없습니다. (id={pid})")

                # 재고 확인과 차감을 한 문장으로 : 동시에 사도 재고가 음수가 되지 않는다
                cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s", (qty, pid, qty))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=409, detail=f"재고가 부족합니다. ({p['name']})")

                lines.append((pid, p["name"], qty, p["price"]))
                total += qty * p["price"]

            cur.execute(
                "INSERT INTO orders (user_id, total_price, status, paid_at, receiver_name, receiver_phone, "
                "zipcode, address, address_detail, request_memo) VALUES (%s, %s, 'PAID', NOW(), %s, %s, %s, %s, %s, %s)",
                (user["id"], total, receiver_name, ship.receiver_phone, ship.zipcode, address, address_detail,
                 (ship.request_memo or "").strip() or None),
            )
            order_id = cur.lastrowid
            if ship.save_address:        # 같은 트랜잭션에서 회원 배송지로 저장 (결제가 실패하면 함께 취소된다)
                save_address(cur, user["id"], receiver_name, ship.receiver_phone, ship.zipcode, address, address_detail)
            cur.executemany(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                [(order_id, pid, qty, price) for pid, _, qty, price in lines],
            )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error("구매 처리 실패: %s", e)
        raise HTTPException(status_code=500, detail="구매 처리 에러")
    finally:
        conn.close()

    logger.info("구매 완료 user_id=%s order_id=%s total=%s", user["id"], order_id, total)
    return {
        "order_id": order_id,
        "status": "PAID",
        "total_price": total,
        "items": [
            {"product_id": pid, "product_name": name, "quantity": qty, "unit_price": price}
            for pid, name, qty, price in lines
        ],
    }


def _fetch_list(sql: str, params: tuple):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    except Exception as e:
        logger.error("조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="조회 에러")
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# GET /orders : 내 주문 목록 (모든 상태)
# -----------------------------------------------------------------------------
@router.get("/orders")
def list_orders(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                user: dict = Depends(get_current_user)):
    return _fetch_list(
        """
        SELECT o.id AS order_id, o.total_price, o.status, o.created_at, o.paid_at,
               MIN(p.name) AS first_product_name, COUNT(oi.id) AS item_count
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.user_id = %s
        GROUP BY o.id, o.total_price, o.status, o.created_at, o.paid_at
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT %s OFFSET %s
        """,
        (user["id"], size, (page - 1) * size),
    )


# -----------------------------------------------------------------------------
# GET /orders/{order_id} : 주문 상세 (내 주문만, 남의 주문은 404)
# -----------------------------------------------------------------------------
@router.get("/orders/{order_id}")
def get_order(order_id: int, user: dict = Depends(get_current_user)):
    head = _fetch_list(
        "SELECT id AS order_id, total_price, status, created_at, paid_at, refunded_at, "
        "receiver_name, receiver_phone, zipcode, address, address_detail, request_memo "
        "FROM orders WHERE id = %s AND user_id = %s",
        (order_id, user["id"]),
    )
    if not head:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
    items = _fetch_list(
        """
        SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price,
               oi.quantity * oi.unit_price AS line_total
        FROM order_items oi JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = %s ORDER BY oi.id
        """,
        (order_id,),
    )
    return {**head[0], "items": items}


# -----------------------------------------------------------------------------
# GET /purchases : 구매내역 = 결제 완료(PAID)만, 기간은 paid_at 기준 (기본 최근 1년)
#   환불(REFUNDED), 결제 전 주문(PENDING), 취소(CANCELLED)는 나오지 않는다.
# -----------------------------------------------------------------------------
PERIOD_DAYS = {"1m": 30, "3m": 90, "6m": 180, "1y": 365}


@router.get("/purchases")
def list_purchases(
    period: str = Query("1y", pattern="^(1m|3m|6m|1y)$"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    since = datetime.now() - timedelta(days=PERIOD_DAYS[period])
    return _fetch_list(
        """
        SELECT o.id AS order_id, o.total_price, o.paid_at,
               MIN(p.name) AS first_product_name, COUNT(oi.id) AS item_count
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.user_id = %s AND o.status = 'PAID' AND o.paid_at >= %s
        GROUP BY o.id, o.total_price, o.paid_at
        ORDER BY o.paid_at DESC, o.id DESC
        LIMIT %s OFFSET %s
        """,
        (user["id"], since, size, (page - 1) * size),
    )
