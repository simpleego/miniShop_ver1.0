-- =============================================================================
-- [7일차] 주문을 회원에 연결 + 배송지
--
--   1) 4일차에 만든 비회원 테스트 주문을 비운다. (user_id 가 없는 주문은 새 규칙(NOT NULL)에 맞지 않는다)
--   2) orders 에 user_id 와 배송지 컬럼을 ALTER TABLE 로 추가한다.
--   3) addresses (회원 배송지) 테이블을 만든다.
--   먼저 step-04, step-06 이 실행되어 있어야 한다.
-- =============================================================================

USE test_vmshop;

-- 1) 비회원 테스트 주문 비우기 (자식 → 부모 순서)
DELETE FROM order_items;
DELETE FROM orders;

-- 2) 주문에 구매자(user_id) + 주문 시점의 배송지를 복사해 둘 컬럼 추가
ALTER TABLE orders
  ADD COLUMN user_id        INT          NOT NULL AFTER id,
  ADD COLUMN receiver_name  VARCHAR(50)  NULL,                    -- 받는 사람 (주문 시점의 값을 복사해 둔다)
  ADD COLUMN receiver_phone VARCHAR(20)  NULL,                    -- 연락처
  ADD COLUMN zipcode        CHAR(5)      NULL,                    -- 우편번호
  ADD COLUMN address        VARCHAR(255) NULL,                    -- 주소
  ADD COLUMN address_detail VARCHAR(100) NULL,                    -- 상세주소
  ADD COLUMN request_memo   VARCHAR(100) NULL,                    -- 배송 요청사항
  ADD KEY idx_orders_user_id (user_id),
  ADD KEY idx_orders_purchase (user_id, status, paid_at),         -- 구매내역(최근 1년) 조회용
  ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id);

-- 3) 회원 배송지 (회원 1 : 배송지 N)
DROP TABLE IF EXISTS addresses;

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

DESCRIBE orders;
