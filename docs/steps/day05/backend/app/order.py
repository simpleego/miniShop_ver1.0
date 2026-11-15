"""주문 API (4일차 → 5일차에 재고 차감을 안전하게 고침) : 장바구니의 상품을 한 번에 구매한다  POST /orders

용어
  주문 = 결제 전의 한시적 상태(PENDING), 구매 = 결제 완료(PAID)
  이 파일의 POST /orders 는 주문과 결제를 한 번에 처리해서 곧바로 PAID 로 만든다. (실제 결제 연동은 하지 않는다)

4일차 버전 : 로그인 없이(비회원) 주문한다. 6~7일차에 회원 기능을 만들고 "누가 샀는지" 를 연결한다.
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .database import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(tags=["orders"])


# -----------------------------------------------------------------------------
# 요청 본문(JSON) 모양
#   화면이 보내는 JSON 이 이 모양과 다르면 FastAPI 가 함수 실행 전에 422 로 거부한다.
#   ※ 가격은 받지 않는다. 가격은 서버가 DB 에서 읽는다. (화면이 보낸 가격은 조작될 수 있다)
# -----------------------------------------------------------------------------
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)         # 1 ~ 99 개


class OrderIn(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)    # 최소 1개 이상


# -----------------------------------------------------------------------------
# POST /orders : 구매하기 (주문 + 결제)
#   하나라도 실패하면 전체를 되돌린다 (rollback).
# -----------------------------------------------------------------------------
@router.post("/orders", status_code=201)
def create_order(body: OrderIn):
    # 같은 상품이 여러 줄이면 수량을 합친다. {상품번호: 수량}
    wanted: dict[int, int] = {}
    for it in body.items:
        wanted[it.product_id] = wanted.get(it.product_id, 0) + it.quantity
    if any(q > 99 for q in wanted.values()):
        raise HTTPException(status_code=422, detail="상품당 수량은 99개까지입니다.")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            lines, total = [], 0
            for pid in sorted(wanted):                 # 번호 순서로 처리 (순서를 고정하면 동시 주문 때 서로 엉키는 일이 줄어든다)
                qty = wanted[pid]

                # ① 상품을 읽는다 : 이름과 가격만 필요하다. (재고는 여기서 읽어 비교하지 않는다)
                #    FOR UPDATE : 이 상품 행을 "잠그고" 최신 값을 읽는다.
                #    같은 상품을 동시에 주문하는 다른 요청은 이 주문이 끝날 때까지 줄을 서서 기다린다.
                cur.execute("SELECT id, name, price FROM products WHERE id = %s AND is_active = 1 FOR UPDATE", (pid,))
                p = cur.fetchone()
                if p is None:
                    raise HTTPException(status_code=404, detail=f"상품을 찾을 수 없습니다. (id={pid})")

                # ② 재고 확인과 차감을 "한 문장" 으로 한다 : 재고가 충분할 때만 줄어든다.
                #    (잠금이 있어도 이 조건이 마지막 안전장치다. 다른 코드가 잠그는 것을 잊어도 재고는 음수가 되지 않는다)
                cur.execute(
                    "UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s",
                    (qty, pid, qty),
                )
                if cur.rowcount == 0:                      # 바뀐 행이 0개 = 재고가 부족해서 조건이 맞지 않았다
                    raise HTTPException(status_code=409, detail=f"재고가 부족합니다. ({p['name']})")

                lines.append((pid, p["name"], qty, p["price"]))
                total += qty * p["price"]                  # 합계도 서버가 계산한다

            # ④ 주문 1건 저장
            cur.execute(
                "INSERT INTO orders (total_price, status, paid_at) VALUES (%s, 'PAID', NOW())",
                (total,),
            )
            order_id = cur.lastrowid                       # 방금 저장한 주문의 번호

            # ⑤ 주문 상품 저장 (unit_price : 주문 당시 가격을 복사해 둔다)
            cur.executemany(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                [(order_id, pid, qty, price) for pid, _, qty, price in lines],
            )

        conn.commit()                                      # 여기까지 오면 전부 성공 → 한꺼번에 확정
    except HTTPException:
        conn.rollback()                                    # 재고 부족 등 : 지금까지 한 일을 전부 되돌린다
        raise
    except Exception as e:
        conn.rollback()
        logger.error("구매 처리 실패: %s", e)
        raise HTTPException(status_code=500, detail="구매 처리 에러")
    finally:
        conn.close()

    logger.info("구매 완료 order_id=%s total=%s", order_id, total)
    return {
        "order_id": order_id,
        "status": "PAID",
        "total_price": total,
        "items": [
            {"product_id": pid, "product_name": name, "quantity": qty, "unit_price": price}
            for pid, name, qty, price in lines
        ],
    }
