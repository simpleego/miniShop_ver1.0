"""관리자 API (/admin) : 상품 관리 목록 / 주문 관리 (목록, 상세, 환불)

모든 API 는 관리자(users.role = 'ADMIN') 로그인이 필요하다. (일반 회원 403, 비로그인 401)
상품 등록 / 수정 / 삭제 자체는 product.py (POST, PUT, DELETE /products) 에 있다.
"""
import json
import logging
from enum import Enum

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from . import images
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
# PUT /admin/products/{id}/images : 상품 이미지 저장 (대표 이미지 3장 + 상세 이미지)
#   multipart/form-data
#     files         : 새로 올리는 이미지 파일들 (순서가 중요하다. 아래 layout 의 "new" 번호가 이 순서를 가리킨다)
#     main_layout   : 대표 이미지 3칸의 최종 모습 (JSON 글자). 보내지 않으면 대표 이미지는 그대로 둔다.
#                     예) [{"keep": "/products/images/a.jpg"}, {"new": 0}, null]
#                     칸 하나 : {"keep": 기존 이미지 주소} / {"new": 파일 번호} / null(비움)
#     detail_layout : 상세 이미지의 최종 목록 (JSON 글자). 보내지 않으면 그대로 둔다.
#                     예) [{"new": 1}, {"keep": "/products/images/detail/b.jpg"}]
#   - 대표 이미지 1번(맨 앞 이미지)을 줄여서 썸네일을 만들어 products.image_url(목록 카드) 로 쓴다.
#   - 바뀌어서 쓰이지 않게 된 옛 업로드 파일은 지운다. (이 서버가 만든 파일만. 시드 이미지는 지우지 않는다)
#   - 파일 저장 중 하나라도 실패하면 이미 저장한 새 파일도 지우고 DB 는 바뀌지 않는다.
# -----------------------------------------------------------------------------
def _parse_layout(raw: str | None, name: str, max_len: int, allow_null: bool):
    if raw is None:
        return None
    try:
        layout = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{name} 형식이 올바르지 않습니다.")
    if not isinstance(layout, list) or len(layout) > max_len:
        raise HTTPException(status_code=422, detail=f"{name} 형식이 올바르지 않습니다. (최대 {max_len}장)")
    for e in layout:
        ok = (e is None and allow_null) or (
            isinstance(e, dict) and len(e) == 1 and
            (isinstance(e.get("keep"), str) or (isinstance(e.get("new"), int) and not isinstance(e.get("new"), bool)))
        )
        if not ok:
            raise HTTPException(status_code=422, detail=f"{name} 형식이 올바르지 않습니다.")
    return layout


@router.put("/products/{product_id}/images")
def save_product_images(
    product_id: int,
    main_layout: str | None = Form(None),
    detail_layout: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    admin: dict = Depends(require_admin),
):
    main = _parse_layout(main_layout, "대표 이미지", images.MAIN_SLOTS, allow_null=True)
    detail = _parse_layout(detail_layout, "상세 이미지", images.DETAIL_MAX, allow_null=False)
    if main is None and detail is None:
        raise HTTPException(status_code=422, detail="저장할 이미지 변경이 없습니다.")
    if len(files) > images.MAIN_SLOTS + images.DETAIL_MAX:
        raise HTTPException(status_code=422, detail="한 번에 올릴 수 있는 파일 수를 넘었습니다.")

    # 파일 번호가 범위를 벗어나거나 한 파일이 두 번 쓰이면 거부
    used = [e["new"] for layout in (main or [], detail or []) for e in layout if e and "new" in e]
    if any(i < 0 or i >= len(files) for i in used) or len(used) != len(set(used)):
        raise HTTPException(status_code=422, detail="파일 정보가 올바르지 않습니다.")

    current = admin_get_product(product_id)           # 없으면 404. 현재 이미지 목록도 함께 얻는다
    old_main, old_detail = current["gallery_images"], current["detail_images"]
    old_thumb = current["image_url"]

    # "keep" 은 이 상품이 지금 가진 이미지 주소만 허용한다 (남의 파일이나 임의 경로를 끌어오지 못하게)
    for layout, allowed in ((main or [], old_main), (detail or [], old_detail)):
        for e in layout:
            if e and "keep" in e and e["keep"] not in allowed:
                raise HTTPException(status_code=422, detail="현재 등록되지 않은 이미지를 지정했습니다.")

    main_final = [e for e in (main or []) if e]       # 빈 칸은 앞으로 당긴다
    if main is not None and not main_final:
        raise HTTPException(status_code=422, detail="대표 이미지는 1장 이상 필요합니다.")

    written: list = []                                 # 이번에 새로 저장한 파일 (실패하면 지운다)
    loaded: dict[int, object] = {}

    def get_new(i):
        if i not in loaded:
            loaded[i] = images.load_image(files[i])
        return loaded[i]

    try:
        new_main_urls, new_thumb = None, None
        if main is not None:
            new_main_urls = []
            for e in main_final:
                new_main_urls.append(e["keep"] if "keep" in e else images.save_main(get_new(e["new"]), written))
            first = main_final[0]
            if "new" in first or new_main_urls[0] != (old_main[0] if old_main else None):
                src = get_new(first["new"]) if "new" in first else images.open_existing(first["keep"])
                if src is not None:
                    new_thumb = images.save_thumbnail(src, written)

        new_detail_urls = None
        if detail is not None:
            new_detail_urls = [
                e["keep"] if "keep" in e else images.save_detail(get_new(e["new"]), written) for e in detail
            ]

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                if new_main_urls is not None:
                    cur.execute("DELETE FROM product_images WHERE product_id = %s AND image_type = 'GALLERY'", (product_id,))
                    for n, url in enumerate(new_main_urls, start=1):
                        cur.execute(
                            "INSERT INTO product_images (product_id, image_type, image_url, sort_order) VALUES (%s, 'GALLERY', %s, %s)",
                            (product_id, url, n),
                        )
                    if new_thumb:
                        cur.execute("UPDATE products SET image_url = %s WHERE id = %s", (new_thumb, product_id))
                if new_detail_urls is not None:
                    cur.execute("DELETE FROM product_images WHERE product_id = %s AND image_type = 'DETAIL'", (product_id,))
                    for n, url in enumerate(new_detail_urls, start=1):
                        cur.execute(
                            "INSERT INTO product_images (product_id, image_type, image_url, sort_order) VALUES (%s, 'DETAIL', %s, %s)",
                            (product_id, url, n),
                        )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    except HTTPException:
        images.delete_files(written)
        raise
    except Exception as e:
        images.delete_files(written)
        logger.error("상품 이미지 저장 실패 id=%s: %s", product_id, e)
        raise HTTPException(status_code=500, detail="이미지 저장 중 오류가 발생했습니다.")

    # 저장이 끝난 뒤, 더는 쓰이지 않는 옛 업로드 파일을 정리한다
    kept = set((new_main_urls or old_main)) | set((new_detail_urls if new_detail_urls is not None else old_detail))
    removed = [u for u in (old_main + old_detail) if u not in kept]
    if new_thumb:
        removed.append(old_thumb)
    stale = []
    for url in removed:
        if url and images.is_generated(url) and not _still_referenced(url):
            stale.append(images.url_to_path(url))
    images.delete_files(stale)

    logger.info("상품 이미지 저장 id=%s by=%s 새 파일 %s개 정리 %s개", product_id, admin["email"], len(written), len(stale))
    return {k: v for k, v in admin_get_product(product_id).items() if k in ("id", "image_url", "gallery_images", "detail_images")}


def _still_referenced(url: str) -> bool:
    """다른 곳(상품 목록 이미지, 다른 이미지 행)에서 아직 이 주소를 쓰고 있는가."""
    n = _query(
        "SELECT (SELECT COUNT(*) FROM products WHERE image_url = %s) + (SELECT COUNT(*) FROM product_images WHERE image_url = %s) AS n",
        (url, url), one=True,
    )["n"]
    return n > 0


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
