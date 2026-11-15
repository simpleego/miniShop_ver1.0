-- =============================================================================
-- [6일차] 회원 : users + email_verifications
--
--   users                : 회원 정보 (비밀번호는 원문이 아니라 scrypt 해시로 저장한다)
--   email_verifications  : 이메일 인증 코드 (코드 자체는 저장하지 않고 해시만 저장한다)
--   먼저 step-01_catalog.sql 이 실행되어 있어야 한다.
-- =============================================================================

USE test_vmshop;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

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
-- 테스트 회원 : 관리자 1명 + 일반 회원 7명  (비밀번호는 모두 test1234!)
-- -----------------------------------------------------------------------------
-- 테스트 계정 비밀번호는 모두 test1234!  (scrypt 해시)
INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES
  (1, 'admin@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '관리자', 'ADMIN', '2026-07-01 09:00:00'),
  (2, 'user1@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '김하나', 'USER',  '2026-07-05 10:00:00'),
  (3, 'user2@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '이두리', 'USER',  '2026-07-10 11:00:00'),
  (4, 'user3@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '박세나', 'USER',  '2026-08-01 12:00:00'),
  (5, 'user4@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '최네오', 'USER',  '2026-08-15 13:00:00'),
  (6, 'user5@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '정다섯', 'USER',  '2026-09-01 14:00:00'),
  (7, 'user6@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '강여섯', 'USER',  '2026-09-20 15:00:00'),
  (8, 'user7@test.local', 'scrypt$16384$8$1$8d39d0a7b5744d98ff3cf2ebce605b07$c77db6e243b50be4bedec6f06981154cb45ef6f3b4baefa728dbd3ac627d2ea75c6c791d3aa22d8065d1e053d856885baaf33e0cf706978802835e793dca7e5e', '윤일곱', 'USER',  '2026-10-01 16:00:00');

SELECT id, email, name, role FROM users;
