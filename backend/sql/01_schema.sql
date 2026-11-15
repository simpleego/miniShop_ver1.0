-- =============================================================================
-- miniShop 데이터베이스 스키마
--
--   DB 이름 : test_vmshop   (운영 DB vmshop 과 분리)
--   테이블  : users, email_verifications, addresses, categories, products, product_images, orders, order_items
--
--   여러 번 실행해도 된다. (테이블을 지우고 다시 만든다 → 기존 테스트 데이터는 사라진다)
--   실행 후 02_test_seed.sql 로 데이터를 채운다.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS test_vmshop
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE test_vmshop;

-- 외래키로 연결된 순서의 반대로 지운다 (자식 → 부모)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
-- product_images 는 products 를 외래키로 참조하는 자식 테이블이므로 products 보다 먼저 지운다.
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;


-- -----------------------------------------------------------------------------
-- 회원
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id            INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(50)  NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'USER',
  status        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_role   CHECK (role IN ('USER', 'ADMIN')),
  CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'BLOCKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 이메일 인증 (회원가입 전에 6자리 코드로 이메일을 확인한다. 코드 자체는 저장하지 않고 해시만 저장)
-- -----------------------------------------------------------------------------
CREATE TABLE email_verifications (
  id          INT          NOT NULL AUTO_INCREMENT,
  email       VARCHAR(100) NOT NULL,
  purpose     VARCHAR(10)  NOT NULL DEFAULT 'SIGNUP',            -- SIGNUP(가입) / RESET(비밀번호 재설정)
  code_hash   CHAR(64)     NOT NULL,
  attempts    INT          NOT NULL DEFAULT 0,
  expires_at  DATETIME     NOT NULL,
  verified_at DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_verifications_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 회원 배송지 (회원 1 : 배송지 N). 주문할 때 입력한 배송지가 자동으로 저장된다.
--   is_default : 기본 배송지 (회원당 1개, 서버 코드가 보장한다)
--   주문(orders)에는 주문 시점의 배송지를 따로 복사해 둔다. 배송지를 고치거나 지워도 지난 주문은 그대로다.
-- -----------------------------------------------------------------------------
CREATE TABLE addresses (
  id             INT          NOT NULL AUTO_INCREMENT,
  user_id        INT          NOT NULL,
  receiver_name  VARCHAR(50)  NOT NULL,
  receiver_phone VARCHAR(20)  NOT NULL,
  zipcode        CHAR(5)      NOT NULL,
  address        VARCHAR(255) NOT NULL,
  address_detail VARCHAR(100) NULL,
  is_default     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 카테고리 (products 가 참조하므로 products 보다 먼저 만든다)
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id   INT         NOT NULL AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 상품 (vmshop.products + A안 컬럼 2개 + 카테고리)
--   category_id 는 NULL 허용 : 카테고리를 아직 정하지 않은 상품도 등록할 수 있게 한다
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id             INT          NOT NULL AUTO_INCREMENT,
  name           VARCHAR(50)  NOT NULL,
  price          INT          NOT NULL,
  stock          INT          NOT NULL DEFAULT 0,
  image_url      VARCHAR(255) DEFAULT NULL,
  description    VARCHAR(255) DEFAULT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  is_recommended TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '추천 상품 여부',          -- A안
  recommend_rank INT          NOT NULL DEFAULT 0 COMMENT '추천 순서 (클수록 위)',   -- A안
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category_id    INT          DEFAULT NULL COMMENT '카테고리',
  PRIMARY KEY (id),
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_stock CHECK (stock >= 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 정렬용 인덱스 (A안)
CREATE INDEX idx_products_active_created ON products (is_active, created_at);
CREATE INDEX idx_products_active_price   ON products (is_active, price);
CREATE INDEX idx_products_active_reco    ON products (is_active, is_recommended, recommend_rank);


-- -----------------------------------------------------------------------------
-- 상품 이미지 (상품 1 : 이미지 N)
--   GALLERY : 상세 화면의 대표 이미지 / 썸네일 (sort_order 1 = 대표)
--   DETAIL  : "상세 보기" 영역의 상세 설명 이미지
--   파일은 backend/products/images/ 에 있고, DB 에는 경로만 저장한다.
-- -----------------------------------------------------------------------------
CREATE TABLE product_images (
  id         INT          NOT NULL AUTO_INCREMENT,
  product_id INT          NOT NULL,
  image_type VARCHAR(10)  NOT NULL DEFAULT 'GALLERY' COMMENT 'GALLERY / DETAIL',
  image_url  VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 1         COMMENT '보여 줄 순서 (작을수록 먼저)',
  PRIMARY KEY (id),
  UNIQUE KEY uq_pimg_order (product_id, image_type, sort_order),
  CONSTRAINT fk_pimg_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT chk_pimg_type   CHECK (image_type IN ('GALLERY', 'DETAIL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 주문
-- -----------------------------------------------------------------------------
-- 용어 : 주문 = 결제 전의 한시적 상태(PENDING) / 구매 = 결제 완료(PAID) 이고 환불되지 않은 것
--   PENDING   주문 (결제 전)
--   PAID      구매 (소유권이 구매자에게 있다 → 구매내역)
--   REFUNDED  환불 (구매로 보지 않는다)
--   CANCELLED 결제 전 취소 (구매로 보지 않는다)
CREATE TABLE orders (
  id          INT         NOT NULL AUTO_INCREMENT,
  user_id     INT         NOT NULL,
  total_price INT         NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'PENDING',
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- 주문 생성 시각
  paid_at     DATETIME    NULL,                                  -- 결제(구매) 시각
  refunded_at DATETIME    NULL,                                  -- 환불 시각
  receiver_name  VARCHAR(50)  NULL,                              -- 배송지 : 받는 사람 (주문 시점의 값을 복사해 둔다)
  receiver_phone VARCHAR(20)  NULL,                              --          연락처
  zipcode        CHAR(5)      NULL,                              --          우편번호
  address        VARCHAR(255) NULL,                              --          주소
  address_detail VARCHAR(100) NULL,                              --          상세주소
  request_memo   VARCHAR(100) NULL,                              --          배송 요청사항
  PRIMARY KEY (id),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_created_at (created_at),
  KEY idx_orders_purchase (user_id, status, paid_at),            -- 구매내역(최근 1년) 조회용
  CONSTRAINT chk_orders_status CHECK (status IN ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED')),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- -----------------------------------------------------------------------------
-- 주문 상품
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
  id         INT NOT NULL AUTO_INCREMENT,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL,
  unit_price INT NOT NULL,
  PRIMARY KEY (id),
  KEY fk_items_order (order_id),
  KEY fk_items_product (product_id),
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id),
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT chk_items_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
