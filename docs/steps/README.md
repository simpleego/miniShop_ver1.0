# 일차별 코드 스냅샷

`dayNN/` 폴더에는 **그날 새로 만들거나 바뀐 파일만** 들어 있습니다. `backend/` 와 `frontend/` 의 폴더 구조는 실제 프로젝트와 같습니다.

| 폴더 | 그날 추가·변경되는 것 |
|---|---|
| `day01` | `.gitignore`, 백엔드 Hello(`main.py`), 프론트 첫 화면 |
| `day02` | `database.py`, `product.py`(목록), 이미지 공개, 상품 카드·목록 화면, 프록시 |
| `day03` | `product.py`(상세), 라우팅, 레이아웃, 상세·장바구니 화면, Context |
| `day04` | `order.py`(주문), 결제·완료 화면 |
| `day05` | `order.py`(재고 안전 차감), `race_test.py` |
| `day06` | `auth.py`, `mailer.py`, 로그인·가입 화면, AuthProvider |
| `day07` | `order.py`(회원·배송지), `address.py`, 결제 화면 완성본, 구매내역 |
| `day08` | `product.py`(검색), 카테고리 메뉴, 검색·정렬·페이지 화면 |
| `day09` | `require_admin`, 상품 CRUD, `admin.py`, 관리자 화면 |
| `day10` | `images.py`, 이미지 업로드, 비밀번호 재설정, **완성본과 같은 기능** (완성본은 React Compiler·린트 설정이 추가되어 있고, 주석이 일부 다르다) |

## 쓰는 법

**차례대로 겹쳐서** 복사합니다. 뒤 일차의 파일이 앞 일차의 같은 파일을 새 버전으로 바꿉니다.

```text
day01 → day02 → day03 → … → dayNN   (원하는 일차까지, 같은 위치에 덮어쓰기)
```

## 스냅샷에 없는 것

| 항목 | 준비 방법 |
|---|---|
| `backend/.env` | `.env.example` 을 복사해 값을 채운다 (비밀번호 등) |
| `backend/products/images/` | 완성본에서 **폴더째** 복사 |
| 프론트 템플릿 (`index.html`, `package.json`, `vite` 설정 일부 ...) | 1일차에 `npm create vite@latest` 로 생성, 필요한 패키지는 일차별로 `npm install` |
| DB | `docs/sql/step-NN_*.sql` 을 해당 일차까지 순서대로 실행 |

> 일차별 DB 상태와 SQL 파일의 대응은 [4. 테이블 설명과 SQL](../04_tables_and_sql.md) 1장을 보세요.
