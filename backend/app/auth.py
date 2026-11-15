"""회원 API : 이메일 인증 → 회원가입 → 로그인(JWT) → 내 정보

흐름
  1) POST /auth/email/send    이메일로 6자리 인증 코드를 보낸다 (5분 유효, 60초 후 재발송)
  2) POST /auth/email/verify  코드를 확인한다 (5회까지 시도, 인증 후 30분 안에 가입해야 한다)
  3) POST /auth/signup        인증된 이메일로 가입한다 (이메일, 비밀번호, 이름)
  4) POST /auth/login         로그인 → 액세스 토큰(JWT) 발급
  5) GET  /auth/me            토큰으로 내 정보 조회

비밀번호 재설정 (이메일 인증 코드를 한 번 더 쓴다. 코드는 purpose 로 가입용과 구분한다)
  6) POST /auth/password/send   가입한 이메일이면 재설정 코드를 보낸다 (가입 여부는 응답으로 알려 주지 않는다)
  7) POST /auth/password/reset  이메일 + 코드 + 새 비밀번호 → 비밀번호 변경

다른 API 에서 로그인한 사용자가 필요하면  user = Depends(get_current_user)  를 쓴다.
외부 패키지 없이 표준 라이브러리만 쓴다. (비밀번호 해시 = scrypt, 토큰 = HS256 JWT)
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time

import pymysql
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from .database import get_connection
from .mailer import send_mail

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_MIN = 5            # 인증 코드 유효 시간 (분)
RESEND_SEC = 60             # 같은 이메일로 다시 보낼 수 있는 간격 (초)
MAX_ATTEMPTS = 5            # 코드 입력 시도 횟수
VERIFIED_TTL_MIN = 30       # 인증 후 가입까지 허용하는 시간 (분)
TOKEN_TTL_SEC = 60 * 60 * 12

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


# ─────────────────────────── 비밀번호 해시 (scrypt) ───────────────────────────
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2 ** 14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P)
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, digest = stored.split("$")
        if algo != "scrypt":
            return False
        calc = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(calc, bytes.fromhex(digest))
    except Exception:           # 형식이 다른 값(예: 시드의 'test-hash')은 로그인 불가
        return False


_DUMMY_HASH = hash_password("dummy-password")   # 없는 이메일도 같은 시간이 걸리게 한다


# ─────────────────────────── JWT (HS256) ───────────────────────────
def _secret() -> bytes:
    key = os.getenv("JWT_SECRET")
    if not key:
        raise RuntimeError("JWT_SECRET 이 .env 에 없습니다.")
    return key.encode()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def create_token(user_id: int, role: str) -> str:
    head = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64(json.dumps({"sub": str(user_id), "role": role, "exp": int(time.time()) + TOKEN_TTL_SEC}).encode())
    sig = _b64(hmac.new(_secret(), f"{head}.{body}".encode(), hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"


def decode_token(token: str) -> dict | None:
    try:
        head, body, sig = token.split(".")
        expected = _b64(hmac.new(_secret(), f"{head}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_unb64(body))
        return payload if payload.get("exp", 0) > time.time() else None
    except Exception:
        return None


# ─────────────────────────── 로그인 사용자 의존성 ───────────────────────────
bearer = HTTPBearer(auto_error=False)


def get_current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    """Authorization: Bearer <토큰> 을 확인해 로그인한 사용자 {id, email, name, role} 를 돌려준다."""
    payload = decode_token(cred.credentials) if cred else None
    if payload is None:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, role, status FROM users WHERE id = %s", (payload["sub"],))
            user = cur.fetchone()
    finally:
        conn.close()
    if user is None:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    if user["status"] != "ACTIVE":
        raise HTTPException(status_code=403, detail="이용이 제한된 계정입니다.")
    user.pop("status")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자(role = ADMIN) 만 통과시킨다. 일반 회원이면 403."""
    if user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자만 사용할 수 있습니다.")
    return user


# ─────────────────────────── 요청 모양 ───────────────────────────
def _norm_email(email: str) -> str:
    email = email.strip().lower()
    if len(email) > 100 or not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="이메일 형식이 올바르지 않습니다.")
    return email


class EmailIn(BaseModel):
    email: str


class PasswordEmailIn(BaseModel):
    email: str


class VerifyIn(BaseModel):
    email: str
    code: str = Field(pattern=r"^\d{6}$")


class SignupIn(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=64)
    name: str = Field(min_length=1, max_length=50)


class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=64)


def _check_password(password: str) -> None:
    if not (re.search(r"[A-Za-z]", password) and re.search(r"\d", password)):
        raise HTTPException(status_code=422, detail="비밀번호는 영문과 숫자를 모두 포함해야 합니다.")


class ResetIn(BaseModel):
    email: str
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=64)


def _code_hash(email: str, code: str) -> str:
    return hmac.new(_secret(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


# ─────────────────────────── 1) 인증 코드 발송 ───────────────────────────
@router.post("/email/send")
def send_code(body: EmailIn):
    email = _norm_email(body.email)
    code = f"{secrets.randbelow(1_000_000):06d}"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

            cur.execute(
                "SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age FROM email_verifications "
                "WHERE email = %s AND purpose = 'SIGNUP' ORDER BY id DESC LIMIT 1", (email,))
            last = cur.fetchone()
            if last and last["age"] < RESEND_SEC:
                raise HTTPException(status_code=429, detail=f"{RESEND_SEC - last['age']}초 후에 다시 요청해 주세요.")

            cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'SIGNUP'", (email,))
            cur.execute(
                "INSERT INTO email_verifications (email, purpose, code_hash, expires_at) "
                "VALUES (%s, 'SIGNUP', %s, NOW() + INTERVAL %s MINUTE)", (email, _code_hash(email, code), CODE_TTL_MIN))
        conn.commit()
    finally:
        conn.close()

    try:
        send_mail(email, "[음료 쇼핑몰] 이메일 인증 코드",
                  f"인증 코드 : {code}\n\n{CODE_TTL_MIN}분 안에 입력해 주세요. 본인이 요청하지 않았다면 무시하세요.")
    except Exception as e:
        logger.error("인증 메일 발송 실패: %s", e)
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'SIGNUP'", (email,))
            conn.commit()
        finally:
            conn.close()
        raise HTTPException(status_code=502, detail="인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.")

    return {"sent": True, "expires_in": CODE_TTL_MIN * 60, "resend_after": RESEND_SEC}


# ─────────────────────────── 2) 코드 확인 ───────────────────────────
@router.post("/email/verify")
def verify_code(body: VerifyIn):
    email = _norm_email(body.email)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, code_hash, attempts, (expires_at < NOW()) AS expired, verified_at "
                "FROM email_verifications WHERE email = %s AND purpose = 'SIGNUP' ORDER BY id DESC LIMIT 1 FOR UPDATE", (email,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=400, detail="인증 코드를 먼저 요청해 주세요.")
            if row["verified_at"] is None:
                if row["expired"]:
                    raise HTTPException(status_code=400, detail="인증 코드가 만료되었습니다. 다시 요청해 주세요.")
                if row["attempts"] >= MAX_ATTEMPTS:
                    raise HTTPException(status_code=429, detail="시도 횟수를 초과했습니다. 코드를 다시 요청해 주세요.")
                if not hmac.compare_digest(row["code_hash"], _code_hash(email, body.code)):
                    cur.execute("UPDATE email_verifications SET attempts = attempts + 1 WHERE id = %s", (row["id"],))
                    conn.commit()
                    left = MAX_ATTEMPTS - row["attempts"] - 1
                    raise HTTPException(status_code=400, detail=f"인증 코드가 일치하지 않습니다. (남은 시도 {left}회)")
                cur.execute(
                    "UPDATE email_verifications SET verified_at = NOW(), expires_at = NOW() + INTERVAL %s MINUTE "
                    "WHERE id = %s", (VERIFIED_TTL_MIN, row["id"]))
        conn.commit()
    finally:
        conn.close()
    return {"verified": True}


# ─────────────────────────── 3) 회원가입 ───────────────────────────
@router.post("/signup", status_code=201)
def signup(body: SignupIn):
    email = _norm_email(body.email)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="이름을 입력해 주세요.")
    _check_password(body.password)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM email_verifications WHERE email = %s AND purpose = 'SIGNUP' AND verified_at IS NOT NULL "
                "AND expires_at > NOW()",
                (email,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=400, detail="이메일 인증이 필요합니다.")
            try:
                cur.execute("INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s)",
                            (email, hash_password(body.password), name))
            except pymysql.err.IntegrityError:
                raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")
            user_id = cur.lastrowid
            cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'SIGNUP'", (email,))
        conn.commit()
    finally:
        conn.close()
    logger.info("회원가입 user_id=%s", user_id)
    return {"id": user_id, "email": email, "name": name}


# ─────────────────────────── 4) 로그인 ───────────────────────────
@router.post("/login")
def login(body: LoginIn):
    email = body.email.strip().lower()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, role, status, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
    finally:
        conn.close()

    ok = verify_password(body.password, user["password_hash"] if user else _DUMMY_HASH)
    if not user or not ok:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")   # 어느 쪽이 틀렸는지 알려 주지 않는다
    if user["status"] != "ACTIVE":
        raise HTTPException(status_code=403, detail="이용이 제한된 계정입니다.")

    return {
        "access_token": create_token(user["id"], user["role"]),
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }


# ─────────────────────────── 5) 내 정보 ───────────────────────────
@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


# ─────────────────────────── 6) 비밀번호 재설정 : 코드 발송 ───────────────────────────
@router.post("/password/send")
def send_reset_code(body: PasswordEmailIn):
    """가입한 이메일이면 재설정 코드를 보낸다.

    가입하지 않은 이메일, 차단된 계정, 너무 빠른 재요청도 **똑같이 성공 응답**을 준다.
    (응답으로 "이 이메일은 가입되어 있다/없다" 를 알아내지 못하게 하기 위해서)
    """
    email = _norm_email(body.email)
    answer = {"sent": True, "expires_in": CODE_TTL_MIN * 60, "resend_after": RESEND_SEC}
    code = f"{secrets.randbelow(1_000_000):06d}"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            if user is None or user["status"] != "ACTIVE":
                return answer
            cur.execute(
                "SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age FROM email_verifications "
                "WHERE email = %s AND purpose = 'RESET' ORDER BY id DESC LIMIT 1", (email,))
            last = cur.fetchone()
            if last and last["age"] < RESEND_SEC:
                return answer
            cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'RESET'", (email,))
            cur.execute(
                "INSERT INTO email_verifications (email, purpose, code_hash, expires_at) "
                "VALUES (%s, 'RESET', %s, NOW() + INTERVAL %s MINUTE)", (email, _code_hash(email, code), CODE_TTL_MIN))
        conn.commit()
    finally:
        conn.close()

    try:
        send_mail(email, "[음료 쇼핑몰] 비밀번호 재설정 코드",
                  f"비밀번호 재설정 코드 : {code}\n\n{CODE_TTL_MIN}분 안에 입력해 주세요. "
                  "본인이 요청하지 않았다면 이 메일을 무시하세요. (비밀번호는 바뀌지 않습니다)")
    except Exception as e:
        logger.error("재설정 메일 발송 실패: %s", e)
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'RESET'", (email,))
            conn.commit()
        finally:
            conn.close()
        raise HTTPException(status_code=502, detail="메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.")
    return answer


# ─────────────────────────── 7) 비밀번호 재설정 : 코드 확인 + 변경 ───────────────────────────
@router.post("/password/reset")
def reset_password(body: ResetIn):
    email = _norm_email(body.email)
    _check_password(body.new_password)
    bad = HTTPException(status_code=400, detail="인증 코드가 올바르지 않거나 만료되었습니다. 코드를 다시 요청해 주세요.")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, code_hash, attempts, (expires_at < NOW()) AS expired FROM email_verifications "
                "WHERE email = %s AND purpose = 'RESET' ORDER BY id DESC LIMIT 1 FOR UPDATE", (email,))
            row = cur.fetchone()
            if row is None or row["expired"] or row["attempts"] >= MAX_ATTEMPTS:
                raise bad
            if not hmac.compare_digest(row["code_hash"], _code_hash(email, body.code)):
                cur.execute("UPDATE email_verifications SET attempts = attempts + 1 WHERE id = %s", (row["id"],))
                conn.commit()
                raise bad
            cur.execute("UPDATE users SET password_hash = %s WHERE email = %s AND status = 'ACTIVE'",
                        (hash_password(body.new_password), email))
            cur.execute("DELETE FROM email_verifications WHERE email = %s AND purpose = 'RESET'", (email,))
        conn.commit()
    finally:
        conn.close()
    logger.info("비밀번호 재설정 완료")
    return {"reset": True}
