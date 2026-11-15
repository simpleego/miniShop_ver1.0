"""상품 API : 목록 GET /products (2일차), 상세 GET /products/{id} (3일차)"""
import logging

from fastapi import APIRouter, HTTPException

from .database import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(tags=["product"])


# -----------------------------------------------------------------------------
# 상품 목록 (2일차)
# -----------------------------------------------------------------------------
def find_all_products():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT id, name, price, stock, image_url
                FROM products
                WHERE is_active = 1
                ORDER BY price
            """
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        conn.close()


@router.get("/products")
def list_products():
    try:
        products = find_all_products()
    except Exception as e:
        logger.error("상품 목록 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="상품 목록 조회 에러")
    logger.info("상품 목록 조회 : %s개", len(products))
    return products


# -----------------------------------------------------------------------------
# 상품 1개 조회 (3일차) : id 로 상품 1개를 꺼내 딕셔너리로 돌려준다. 없으면 None
# -----------------------------------------------------------------------------
def find_product_by_id(product_id):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # %s : 값이 들어갈 "빈칸". 값은 execute 의 두 번째 인자로 따로 넘긴다. (파라미터 바인딩)
            #   -> SQL 인젝션 공격을 막아 준다. f-string 으로 SQL 에 직접 이어 붙이지 않는다.
            # 목록과 달리 상세 화면에서는 description(설명)도 함께 꺼낸다.
            sql = """
                SELECT id, name, price, stock, image_url, description
                FROM products
                WHERE id = %s AND is_active = 1
            """
            # (product_id,) : 값이 하나여도 튜플로 넘긴다. 끝의 쉼표를 빼먹지 않는다.
            cursor.execute(sql, (product_id,))

            # fetchone : 한 행만 꺼낸다. 결과가 없으면 None 이다.
            return cursor.fetchone()
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# 상품 이미지 조회 (3일차) : product_images 테이블
#   GALLERY : 상세 화면의 대표 이미지 / 썸네일 (sort_order 가 작은 것이 먼저, 첫 번째 = 대표)
#   DETAIL  : "상세 보기" 를 눌렀을 때 보여 줄 상세 설명 이미지
#   돌려주는 모양 : {"gallery_images": ["경로", ...], "detail_images": ["경로", ...]}
# -----------------------------------------------------------------------------
def find_product_images(product_id):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT image_type, image_url
                FROM product_images
                WHERE product_id = %s
                ORDER BY sort_order, id
            """
            cursor.execute(sql, (product_id,))
            rows = cursor.fetchall()

        return {
            "gallery_images": [r["image_url"] for r in rows if r["image_type"] == "GALLERY"],
            "detail_images": [r["image_url"] for r in rows if r["image_type"] == "DETAIL"],
        }
    finally:
        conn.close()


# GET /products/{product_id} : 상품 상세
#   product_id: int 라고 적으면 FastAPI 가 숫자인지 검사해 준다. (/products/abc → 422)
@router.get("/products/{product_id}")
def get_product(product_id: int):
    try:
        product = find_product_by_id(product_id)
        if product is not None:
            # 상세 화면용 이미지 목록을 응답에 덧붙인다
            product.update(find_product_images(product_id))
    except Exception as e:
        logger.error("상품 상세 조회 실패 id=%s: %s", product_id, e)
        raise HTTPException(status_code=500, detail="상품 상세 조회 에러")

    # 상품이 없는 경우 : 서버 오류(500)가 아니라 "찾을 수 없음(404)" 이다
    if product is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")

    return product
