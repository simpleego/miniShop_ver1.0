-- =============================================================================
-- [1일차] 상품 카탈로그 : 데이터베이스 + categories + products
--
--   무엇을 하나 : 쇼핑몰의 "진열대" 데이터를 만든다. (카테고리 7개, 상품 35개)
--   실행 방법   : mysql -u 계정 -p < step-01_catalog.sql
--   여러 번 실행해도 된다. (이 DB 의 테이블을 지우고 다시 만든다 → 데이터가 초기화된다)
--
--   주의 : 이후 단계의 SQL 은 이 파일이 먼저 실행되어 있어야 한다.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS test_vmshop
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE test_vmshop;

-- 외래키로 연결된 테이블은 자식 → 부모 순서로 지운다
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;


-- 카테고리 (products 가 참조하므로 products 보다 먼저 만든다)
CREATE TABLE categories (
  id   INT         NOT NULL AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 상품
--   category_id 는 NULL 허용 : 카테고리를 아직 정하지 않은 상품도 등록할 수 있게 한다
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

-- 정렬용 인덱스 (8일차 정렬 기능에서 사용)
CREATE INDEX idx_products_active_created ON products (is_active, created_at);
CREATE INDEX idx_products_active_price   ON products (is_active, price);
CREATE INDEX idx_products_active_reco    ON products (is_active, is_recommended, recommend_rank);


-- -----------------------------------------------------------------------------
-- 기초 데이터 : 카테고리 7개
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name) VALUES
  (1, '탄산'),
  (2, '주스'),
  (3, '물'),
  (4, '커피'),
  (5, '차'),
  (6, '우유'),
  (7, '기타');


-- -----------------------------------------------------------------------------
-- 기초 데이터 : 상품 35개
--   is_active = 0 인 상품(33, 34번)은 "판매중지" 라서 화면에 나오면 안 된다.
--   35번 상품은 카테고리가 없고(NULL), 이름에 _ 가 들어 있다. (8일차 검색 실습용)
-- -----------------------------------------------------------------------------
INSERT INTO products
  (id, name, price, stock, image_url, description, is_active, is_recommended, recommend_rank, created_at, category_id)
VALUES
  -- 탄산 (1)
  ( 1, '콜라',              1500,  50, '/products/images/cola.jpg',     '시원한 콜라',            1, 1, 90, '2026-08-01 09:00:00', 1),
  ( 2, '제로콜라',          1600,  40, NULL,                            '설탕 없는 콜라',         1, 0,  0, '2026-10-20 09:00:00', 1),
  ( 3, '체리콜라',          1700,   0, NULL,                            '체리향 콜라 (품절)',     1, 0,  0, '2026-09-15 09:00:00', 1),
  ( 4, '사이다',            1400,  30, '/products/images/cider.jpg',    '청량한 사이다',          1, 0,  0, '2026-08-01 09:00:00', 1),
  ( 5, '제로사이다',        1500,  25, NULL,                            '설탕 없는 사이다',       1, 0,  0, '2026-10-25 09:00:00', 1),
  (14, '탄산수',            1200,  40, NULL,                            '무가당 탄산수',          1, 0,  0, '2026-09-20 09:00:00', 1),
  (15, '레몬 탄산수',       1400,  30, NULL,                            '레몬향 탄산수',          1, 0,  0, '2026-10-10 09:00:00', 1),
  -- 주스 (2)
  ( 6, '오렌지주스',        2000,   0, '/products/images/orange.jpg',   '오렌지주스 (품절)',      1, 0,  0, '2026-08-01 09:00:00', 2),
  ( 7, '100% 오렌지주스',   2800,  15, NULL,                            '착즙 오렌지 100%',       1, 1, 70, '2026-11-05 09:00:00', 2),
  ( 8, '사과주스',          2200,  20, NULL,                            '국산 사과',              1, 0,  0, '2026-09-01 09:00:00', 2),
  ( 9, '포도주스',          2200,  12, NULL,                            '캠벨 포도',              1, 0,  0, '2026-09-01 09:00:00', 2),
  (10, '망고주스',          2500,   8, NULL,                            '애플망고',               1, 0,  0, '2026-11-01 09:00:00', 2),
  (11, '토마토주스',        2300,   5, NULL,                            '무가당 토마토',          1, 0,  0, '2026-07-10 09:00:00', 2),
  -- 물 (3)
  (12, '생수 500ml',        1000, 100, '/products/images/water.jpg',    '먹는샘물 500ml',         1, 1, 50, '2026-08-01 09:00:00', 3),
  (13, '생수 2L',           1800,  60, NULL,                            '먹는샘물 2L',            1, 0,  0, '2026-08-01 09:00:00', 3),
  -- 커피 (4)
  (16, '아메리카노 커피',   2500,  30, '/products/images/coffee.jpg',   '캔 아메리카노',          1, 1, 80, '2026-08-05 09:00:00', 4),
  (17, '카페라떼 커피',     2800,  25, NULL,                            '캔 카페라떼',            1, 0,  0, '2026-08-05 09:00:00', 4),
  (18, '콜드브루 커피',     3200,  10, NULL,                            '콜드브루 원액',          1, 0,  0, '2026-11-08 09:00:00', 4),
  (19, '바닐라라떼 커피',   3000,   0, NULL,                            '바닐라라떼 (품절)',      1, 0,  0, '2026-10-01 09:00:00', 4),
  -- 차 (5)
  (20, '녹차',              1800,  20, '/products/images/greentea.jpg', '보성 녹차',              1, 0,  0, '2026-08-10 09:00:00', 5),
  (21, '홍차',              1900,  15, NULL,                            '얼그레이 홍차',          1, 0,  0, '2026-08-10 09:00:00', 5),
  (22, '보리차',            1500,  35, NULL,                            '구수한 보리차',          1, 0,  0, '2026-09-05 09:00:00', 5),
  (23, '옥수수수염차',      1700,  30, NULL,                            '옥수수수염차',           1, 0,  0, '2026-09-05 09:00:00', 5),
  (24, '유자차',            2400,  10, NULL,                            '고흥 유자',              1, 0,  0, '2026-10-15 09:00:00', 5),
  -- 우유 (6)
  (25, '바나나우유',        1700,  40, NULL,                            '바나나맛 우유',          1, 1, 60, '2026-08-15 09:00:00', 6),
  (26, '딸기우유',          1700,  35, NULL,                            '딸기맛 우유',            1, 0,  0, '2026-08-15 09:00:00', 6),
  (27, '초코우유',          1700,   0, NULL,                            '초코맛 우유 (품절)',     1, 0,  0, '2026-08-15 09:00:00', 6),
  -- 기타 (7)
  (28, '이온음료',          1600,  45, NULL,                            '갈증 해소',              1, 0,  0, '2026-09-10 09:00:00', 7),
  (29, '에너지드링크',      2200,  20, NULL,                            '카페인 함유',            1, 0,  0, '2026-10-05 09:00:00', 7),
  (30, '식혜',              1500,  18, NULL,                            '전통 식혜',              1, 0,  0, '2026-09-25 09:00:00', 7),
  (31, '수정과',            1600,  12, NULL,                            '계피 수정과',            1, 0,  0, '2026-09-25 09:00:00', 7),
  (32, '매실음료',          1500,   0, NULL,                            '매실 음료 (품절)',       1, 0,  0, '2026-07-20 09:00:00', 7),
  -- 판매중지 (검색에 나오면 안 됨) : 카테고리 필터를 걸어도 나오면 안 된다
  (33, '단종 콜라',         1200,   0, NULL,                            '판매중지 (판매량 많음)', 0, 0,  0, '2026-06-01 09:00:00', 1),
  (34, '테스트 주스',       9999,   5, NULL,                            '판매중지 (가장 비쌈)',   0, 1, 99, '2026-11-10 09:00:00', 2),
  -- LIKE 특수문자 테스트 + 카테고리 미분류(NULL) 테스트
  (35, '언더바_테스트 음료', 1000,   5, NULL,                            '이름에 _ 포함',          1, 0,  0, '2026-11-11 09:00:00', NULL);


-- -----------------------------------------------------------------------------
-- 상품 대표 이미지 경로 (파일은 backend/products/images/ 에 있다)
--   DB 에는 파일이 아니라 "경로 글자" 만 저장한다.
-- -----------------------------------------------------------------------------
UPDATE products SET image_url = '/products/images/cola.jpg' WHERE id = 1;
UPDATE products SET image_url = '/products/images/product_2.jpg' WHERE id = 2;
UPDATE products SET image_url = '/products/images/product_3.jpg' WHERE id = 3;
UPDATE products SET image_url = '/products/images/cider.jpg' WHERE id = 4;
UPDATE products SET image_url = '/products/images/product_5.jpg' WHERE id = 5;
UPDATE products SET image_url = '/products/images/orange.jpg' WHERE id = 6;
UPDATE products SET image_url = '/products/images/product_7.jpg' WHERE id = 7;
UPDATE products SET image_url = '/products/images/product_8.jpg' WHERE id = 8;
UPDATE products SET image_url = '/products/images/product_9.jpg' WHERE id = 9;
UPDATE products SET image_url = '/products/images/product_10.jpg' WHERE id = 10;
UPDATE products SET image_url = '/products/images/product_11.jpg' WHERE id = 11;
UPDATE products SET image_url = '/products/images/water.jpg' WHERE id = 12;
UPDATE products SET image_url = '/products/images/product_13.jpg' WHERE id = 13;
UPDATE products SET image_url = '/products/images/product_14.jpg' WHERE id = 14;
UPDATE products SET image_url = '/products/images/product_15.jpg' WHERE id = 15;
UPDATE products SET image_url = '/products/images/coffee.jpg' WHERE id = 16;
UPDATE products SET image_url = '/products/images/product_17.jpg' WHERE id = 17;
UPDATE products SET image_url = '/products/images/product_18.jpg' WHERE id = 18;
UPDATE products SET image_url = '/products/images/product_19.jpg' WHERE id = 19;
UPDATE products SET image_url = '/products/images/greentea.jpg' WHERE id = 20;
UPDATE products SET image_url = '/products/images/product_21.jpg' WHERE id = 21;
UPDATE products SET image_url = '/products/images/product_22.jpg' WHERE id = 22;
UPDATE products SET image_url = '/products/images/product_23.jpg' WHERE id = 23;
UPDATE products SET image_url = '/products/images/product_24.jpg' WHERE id = 24;
UPDATE products SET image_url = '/products/images/product_25.jpg' WHERE id = 25;
UPDATE products SET image_url = '/products/images/product_26.jpg' WHERE id = 26;
UPDATE products SET image_url = '/products/images/product_27.jpg' WHERE id = 27;
UPDATE products SET image_url = '/products/images/product_28.jpg' WHERE id = 28;
UPDATE products SET image_url = '/products/images/product_29.jpg' WHERE id = 29;
UPDATE products SET image_url = '/products/images/product_30.jpg' WHERE id = 30;
UPDATE products SET image_url = '/products/images/product_31.jpg' WHERE id = 31;
UPDATE products SET image_url = '/products/images/product_32.jpg' WHERE id = 32;
UPDATE products SET image_url = '/products/images/product_33.jpg' WHERE id = 33;
UPDATE products SET image_url = '/products/images/product_34.jpg' WHERE id = 34;
UPDATE products SET image_url = '/products/images/product_35.jpg' WHERE id = 35;

-- 확인 : 상품 35개, 카테고리 7개가 나와야 한다
SELECT (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM products) AS products;
