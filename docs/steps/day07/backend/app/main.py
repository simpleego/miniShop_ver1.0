import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .address import router as address_router
from .auth import router as auth_router
from .order import router as order_router
from .product import router as product_router

# 로그 설정 : "시간 [레벨] 파일: 메시지" 모양으로 터미널에 출력한다
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="음료 쇼핑몰")

# -----------------------------------------------------------------------------
# 상품 이미지 파일 공개 : backend/products/images 폴더를 주소 /products/images 로 내려준다.
#   DB 의 image_url("/products/images/cola.jpg") 이 곧 실제 접속 주소가 된다.
#   ※ 라우터 등록보다 먼저 해야 한다. (3일차의 GET /products/{id} 가 "/products/images/.." 를 가로채지 않게)
# -----------------------------------------------------------------------------
IMAGES_DIR = Path(__file__).resolve().parent.parent / "products" / "images"
app.mount("/products/images", StaticFiles(directory=IMAGES_DIR), name="product-images")

app.include_router(product_router)   # 상품 API (/products)
app.include_router(order_router)     # 주문 API (/orders)
app.include_router(auth_router)      # 회원 API (/auth : 이메일 인증, 가입, 로그인, 내 정보)
app.include_router(address_router)   # 회원 배송지 API (/addresses) - 로그인 필요


@app.get("/")
def root():
    return {"message": "서버가 실행중입니다"}
