import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .images import IMAGES_DIR
from .product import router as product_router
from .address import router as address_router
from .admin import router as admin_router
from .auth import router as auth_router
from .order import router as order_router

app = FastAPI(title="음료수 자판기 ")


# -----------------------------------------------------------------------------
# 상품 이미지 파일 서빙 : backend/products/images 폴더를 주소 /products/images 로 내려준다.
#   DB 의 image_url("/products/images/cola.jpg") 이 곧 실제 접속 주소가 된다.
#   하위 폴더(detail/)도 그대로 내려간다.  예) /products/images/detail/cola_detail.jpg
#   이미지를 한 곳(이 폴더)에서만 관리하므로, 프론트로 복사할 필요가 없다.
#
#   개발 중에는 이미지를 같은 이름으로 자주 바꾸므로 브라우저가 저장해 두지 않게(no-store) 한다.
#   ※ 배포할 때는 캐시를 허용하도록 바꾼다.
# -----------------------------------------------------------------------------
class NoCacheStaticFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-store"
        return response


# IMAGES_DIR : backend/products/images (app/images.py 에 정의)
app.mount("/products/images", NoCacheStaticFiles(directory=IMAGES_DIR), name="product-images")

# -----------------------------------------------------------------------------
# 라우터 등록 : 기능별 파일로 나눈다.
#   ※ 이미지 마운트(/products/images)를 먼저 해야 한다. 상품 라우터의 GET /products/{product_id} 가
#     "/products/images/..." 요청을 먼저 가져가지 않는다.
# -----------------------------------------------------------------------------
app.include_router(product_router)  # 상품 목록 / 상세 / 등록 / 수정 / 삭제 + 검색 (/products, /search)
app.include_router(auth_router)     # 회원 API (/auth : 이메일 인증, 가입, 로그인, 내 정보)
app.include_router(address_router)  # 회원 배송지 API (/addresses) - 로그인 필요
app.include_router(order_router)    # 주문 / 구매 API (/orders, /purchases) - 로그인 필요
app.include_router(admin_router)    # 관리자 API (/admin : 상품 관리 목록, 주문 관리, 환불) - 관리자만

# -----------------------------------------------------------------------------
# 로그 설정
#   level=logging.INFO : INFO 이상(INFO, WARNING, ERROR ...)의 로그를 출력한다. (DEBUG 는 숨김)
#   format             : 한 줄의 모양 -> "시간 [레벨] 로거이름: 메시지"
#   getLogger(__name__): 이 파일 전용 로거. __name__ 은 "app.main" 이 되어 어느 파일의 로그인지 알 수 있다.
# print 와 달리 레벨(중요도)로 걸러 볼 수 있고, 시간 등 정보가 자동으로 붙는다.
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@app.get("/")
def root():
    return {"message": "서버가 실행중입니다"}
