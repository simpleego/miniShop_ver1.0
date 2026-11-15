-- =============================================================================
-- [4일차] 주문 : orders + order_items  (비회원 주문 버전)
--
--   이 단계의 orders 는 "누가 샀는지(user_id)" 가 아직 없다. 회원 기능을 만들기 전이기 때문이다.
--   7일차에 회원 연결과 배송지 컬럼을 ALTER TABLE 로 추가한다. (실무에서 테이블이 자라나는 방식)
--
--   상태(status) : PENDING 주문(결제 전) / PAID 구매(결제 완료) / REFUNDED 환불 / CANCELLED 취소
--   먼저 step-01_catalog.sql 이 실행되어 있어야 한다.
-- =============================================================================

USE test_vmshop;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id          INT         NOT NULL AUTO_INCREMENT,
  total_price INT         NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'PENDING',
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- 주문 생성 시각
  paid_at     DATETIME    NULL,                                  -- 결제(구매) 시각
  refunded_at DATETIME    NULL,                                  -- 환불 시각
  PRIMARY KEY (id),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT chk_orders_status CHECK (status IN ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
