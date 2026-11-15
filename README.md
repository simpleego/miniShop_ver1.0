# miniShop v1.0

음료 쇼핑몰 풀스택 프로젝트 — **FastAPI + MariaDB + React(Vite)**

## 기능

| 영역 | 내용 |
|---|---|
| 상품 | 목록 / 상세(이미지 갤러리) / 카테고리 / 검색(1차, 결과 내 재검색) / 정렬 / 페이지 |
| 회원 | 이메일 6자리 인증 → 가입(이메일, 비밀번호, 이름) → 로그인(JWT) → 비밀번호 재설정 |
| 주문·결제 | 장바구니 → 배송지 입력(다음 우편번호, 배송지 저장) → 결제 확인 → 구매 확정, 재고 차감(동시성 안전) |
| 구매내역 | 결제 완료(PAID)만, 기간별 조회, 상세 펼침 |
| 관리자 | 상품 등록 / 수정 / 삭제(판매중지) + 이미지 업로드(대표 3장, 상세 최대 10장, 썸네일 자동 생성), 주문 목록 / 상세 / 환불(재고 복구) |

용어: **주문**(PENDING) = 결제 전 임시 상태, **구매**(PAID) = 결제 완료, **환불**(REFUNDED)은 구매가 아니며 구매내역에서 제외된다.

## 폴더

```
backend/
  app/        main.py(앱, 이미지 서빙) · product.py · auth.py · order.py · address.py · admin.py · images.py(업로드 처리) · mailer.py · database.py
  sql/        01_schema.sql → 02_seed.sql → 03_product_images.sql
  products/images/   상품 이미지 (서버가 /products/images/... 로 내려준다)
frontend/
  src/        App.jsx(라우팅) · api/ · pages/ · pages/admin/ · components/ · context/ · layout/ · utils/
```

## 실행

필요: Python 3.11+, Node.js 20+, MariaDB

```bash
# 1) DB (한 번만) : 순서대로 실행
mysql -u <계정> -p < backend/sql/01_schema.sql
mysql -u <계정> -p < backend/sql/02_seed.sql
mysql -u <계정> -p test_vmshop < backend/sql/03_product_images.sql

# 2) 백엔드  (http://localhost:8000, API 문서 /docs)
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt   # Windows
cp .env.example .env        # DB 계정, JWT_SECRET, (선택) SMTP 값을 채운다
.venv/Scripts/python -m uvicorn app.main:app --port 8000

# 3) 프론트  (http://localhost:5173)
cd frontend
npm install
npm run dev
```

- `.env` 의 `SMTP_HOST` 를 비워 두면 인증 코드를 메일로 보내지 않고 **서버 콘솔에 출력**한다.
- 프론트의 `/products /search /auth /orders /purchases /addresses /admin` 요청은 Vite 프록시가 백엔드(8000)로 전달한다.
  그래서 화면 주소는 이 이름과 겹치지 않게 `/mypage/purchases`, `/manage/...` 처럼 만들었다.

## 테스트 계정 (비밀번호 모두 `test1234!`)

| 계정 | 권한 |
|---|---|
| `admin@test.local` | 관리자 → 헤더에 "관리자" 메뉴 (`/manage`) |
| `user1@test.local` ~ `user7@test.local` | 일반 회원 |

## API 요약

| 구분 | 주소 | 권한 |
|---|---|---|
| 상품 | `GET /products/{id}`, `GET /search/products·categories·sort-options` | 누구나 |
| 상품 관리 | `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}` (판매중지) | 관리자 |
| 회원 | `/auth/email/send·verify`, `/auth/signup`, `/auth/login`, `/auth/me`, `/auth/password/send·reset` | 누구나 / 로그인 |
| 배송지 | `GET /addresses`, `PUT /addresses/{id}/default`, `DELETE /addresses/{id}` | 로그인 |
| 주문·구매 | `POST /orders`, `GET /orders`, `GET /orders/{id}`, `GET /purchases` | 로그인 |
| 관리자 | `GET /admin/products·orders`, `GET /admin/…/{id}`, `PUT /admin/products/{id}/images`(이미지 저장), `POST /admin/orders/{id}/refund` | 관리자 |

## 알려진 한계

- 실제 결제(PG) 연동 없음 (결제 확인 대화상자로 구매 확정), 쿠폰/적립은 화면용 가상 값
- 로그인 시도 횟수 제한, 토큰 폐기(비밀번호 변경 시 기존 토큰 무효화)는 없음 (토큰은 12시간 유효)
- 배송지는 주문 시 자동 저장만 지원 (별도 관리 화면 없음), 회원 직접 환불/주문취소 없음
- 상품 이미지 업로드는 서버 로컬 폴더에 저장 (JPG/PNG/WEBP, 2MB 이하). 클라우드 저장소/CDN 없음. 상품평 없음
- 간편 로그인(구글 등) 버튼은 "준비 중" 표시만
