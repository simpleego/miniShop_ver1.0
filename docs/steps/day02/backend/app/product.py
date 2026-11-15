"""상품 API (2일차) : 상품 목록  GET /products"""
import logging

from fastapi import APIRouter, HTTPException

from .database import get_connection

logger = logging.getLogger(__name__)

# 라우터 : 관련 있는 API 들을 한 묶음으로 만든다. main.py 에서 앱에 붙인다.
router = APIRouter(tags=["product"])


# -----------------------------------------------------------------------------
# DB 에서 판매 중인 상품을 꺼내는 함수 (SQL 실행)
#   ① DB 연결  ②  SQL 실행  ③ 결과 받기  ④ 연결 닫기
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
            return cursor.fetchall()      # 딕셔너리의 리스트 : [{"id": 1, "name": "콜라", ...}, ...]
    finally:
        conn.close()                      # 오류가 나도 연결은 반드시 닫는다


# GET /products : 상품 목록
@router.get("/products")
def list_products():
    try:
        products = find_all_products()
    except Exception as e:
        logger.error("상품 목록 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="상품 목록 조회 에러")
    logger.info("상품 목록 조회 : %s개", len(products))
    return products
