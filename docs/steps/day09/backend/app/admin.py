"""관리자 API (/admin) : 상품 관리 목록 / 주문 관리 (목록, 상세, 환불)  ※ 상품 이미지 저장은 10일차에 추가

모든 API 는 관리자(users.role = 'ADMIN') 로그인이 필요하다. (일반 회원 403, 비로그인 401)
상품 등록 / 수정 / 삭제 자체는 product.py (POST, PUT, DELETE /products) 에 있다.
"""
import logging
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query

from .auth import require_admin
from .database import get_connection
from .product import find_product_images, to_like_pattern

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _query(sql: str, params: tuple = (), one: bool = False):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone() if one else cur.fetchall()
    except Exception as e:
        logger.error("관리자 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="조회 중 오류가 발생했습니다.")
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# 상품 관리
#   일반 목록(/products)은 판매 중인 상품만 주지만, 관리자는 판매중지 상품도 봐야 한다.
# -----------------------------------------------------------------------------
class ProductStatus(str, Enum):
    all = "all"
    active = "active"
    inactive = "inactive"


@router.get("/products")
def admin_list_products(
    keyword: str | None = Query(None, max_length=50),
    status: ProductStatus = ProductStatus.all,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    where, params = ["1 = 1"], []
    if keyword and keyword.strip():
        where.append("p.name LIKE %s")
        params.append(to_like_pattern(keyword.strip()))
    if status != ProductStatus.all:
        where.append("p.is_active = %s")
        params.append(1 if status == ProductStatus.active else 0)
    where_sql = " AND ".join(where)

    total = _query(f"SELECT COUNT(*) AS n FROM products p WHERE {where_sql}", tuple(params), one=True)["n"]
    items = _query(
        f"""
        SELECT p.id, p.name, p.price, p.stock, p.image_url, p.is_active, p.is_recommended,
               p.created_at, p.category_id, c.name AS category_name
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE {where_sql}
        ORDER BY p.id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (size, (page - 1) * size),
    )
    return {"page": page, "size": size, "total": total, "total_pages": (total + size - 1) // size, "items": items}


@router.get("/products/{product_id}")
def admin_get_product(product_id: int):
    """수정 / 이미지 관리 화면용 상품 1개 (판매중지 상품 포함, 모든 필드 + 이미지 목록)"""
    product = _query(
        "SELECT id, name, price, stock, category_id, description, image_url, is_active, is_recommended, recommend_rank "
        "FROM products WHERE id = %s",
        (product_id,), one=True,
    )
    if product is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")
    for k in ("is_active", "is_recommended"):
        product[k] = bool(product[k])
    # 이미지 관리 화면용 : 대표 이미지(gallery_images) / 상세 이미지(detail_images) 경로 목록
    product.update(find_product_images(product_id))
    return product


# -----------------------------------------------------------------------------
# 주문 관리
# -----------------------------------------------------------------------------
class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


@router.get("/orders")
def admin_list_orders(
    status: OrderStatus | None = None,
    keyword: str | None = Query(None, max_length=100, description="주문번호, 회원 이메일 / 이름"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    where, params = ["1 = 1"], []
    if status:
        where.append("o.status = %s")
        params.append(status.value)
    if keyword and keyword.strip():
        k = keyword.strip()
        cond = "u.email LIKE %s OR u.name LIKE %s"
        params += [to_like_pattern(k), to_like_pattern(k)]
        if k.isdigit():
            cond += " OR o.id = %s"
            params.append(int(k))
        where.append(f"({cond})")
    where_sql = " AND ".join(where)

    total = _query(
        f"SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE {where_sql}",
        tuple(params), one=True,
    )["n"]
    items = _query(
        f"""
        SELECT o.id AS order_id, o.total_price, o.status, o.created_at, o.paid_at, o.refunded_at,
               u.email, u.name AS user_name,
               (SELECT p.name FROM order_items oi JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) AS first_product_name,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE {where_sql}
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (size, (page - 1) * size),
    )
    return {"page": page, "size": size, "total": total, "total_pages": (total + size - 1) // size, "items": items}


@router.get("/orders/{order_id}")
def admin_get_order(order_id: int):
    head = _query(
        """
        SELECT o.id AS order_id, o.total_price, o.status, o.created_at, o.paid_at, o.refunded_at,
               o.receiver_name, o.receiver_phone, o.zipcode, o.address, o.address_detail, o.request_memo,
               u.id AS user_id, u.email, u.name AS user_name
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = %s
        """,
        (order_id,), one=True,
    )
    if head is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
    items = _query(
        """
        SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price,
               oi.quantity * oi.unit_price AS line_total
        FROM order_items oi JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = %s ORDER BY oi.id
        """,
        (order_id,),
    )
    return {**head, "items": items}


# -----------------------------------------------------------------------------
# POST /admin/orders/{id}/refund : 환불 (PAID → REFUNDED)
#   환불되면 구매가 아니므로 구매내역에서 빠지고, 가져갔던 재고는 되돌린다.
#   한 트랜잭션 : 주문 행을 잠그고(FOR UPDATE) 상태를 확인한 뒤 재고 복구와 상태 변경을 함께 처리한다.
#   이미 환불된 주문 / 결제 전 주문은 409 (두 번 눌러도 재고가 두 번 늘지 않는다).
# -----------------------------------------------------------------------------
@router.post("/orders/{order_id}/refund")
def refund_order(order_id: int, admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM orders WHERE id = %s FOR UPDATE", (order_id,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
            if row["status"] != "PAID":
                raise HTTPException(status_code=409, detail="결제 완료(구매) 상태의 주문만 환불할 수 있습니다.")

            # 교착(deadlock)을 줄이려고 상품 id 순으로 재고를 되돌린다
            cur.execute(
                "SELECT product_id, quantity FROM order_items WHERE order_id = %s ORDER BY product_id",
                (order_id,),
            )
            for it in cur.fetchall():
                cur.execute(
                    "UPDATE products SET stock = stock + %s WHERE id = %s", (it["quantity"], it["product_id"])
                )
            cur.execute(
                "UPDATE orders SET status = 'REFUNDED', refunded_at = NOW() WHERE id = %s AND status = 'PAID'",
                (order_id,),
            )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error("환불 실패 order_id=%s: %s", order_id, e)
        raise HTTPException(status_code=500, detail="환불 처리 중 오류가 발생했습니다.")
    finally:
        conn.close()
    logger.info("환불 order_id=%s by=%s", order_id, admin["email"])
    return {"order_id": order_id, "status": "REFUNDED"}
