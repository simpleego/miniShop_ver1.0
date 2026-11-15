"""회원 배송지 API : 한 회원이 배송지를 여러 개 가질 수 있다 (addresses 테이블, 회원 1 : 배송지 N)

  GET    /addresses               내 배송지 목록 (기본 배송지가 맨 위)
  PUT    /addresses/{id}/default  기본 배송지로 지정
  DELETE /addresses/{id}          삭제 (기본 배송지를 지우면 가장 최근 배송지가 기본이 된다)

배송지는 주문할 때 자동으로 저장된다. (order01.py 의 create_order 가 save_address 를 호출)
모두 로그인이 필요하고, 내 배송지만 다룬다.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException

from .auth import get_current_user
from .database import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/addresses", tags=["address"])

MAX_ADDRESSES = 10          # 회원 1명이 저장할 수 있는 배송지 수


def save_address(cur, user_id, receiver_name, receiver_phone, zipcode, address, address_detail):
    """주문한 배송지를 회원 배송지로 저장한다. (주문과 같은 트랜잭션 안에서 호출)

    - 같은 배송지가 이미 있으면 새로 만들지 않는다.
    - 첫 배송지는 기본 배송지가 된다.
    - 이미 MAX_ADDRESSES 개를 저장했으면 더 저장하지 않는다. (주문은 계속 진행된다)
    """
    cur.execute(
        "SELECT 1 FROM addresses WHERE user_id = %s AND receiver_name = %s AND receiver_phone = %s "
        "AND zipcode = %s AND address = %s AND COALESCE(address_detail, '') = %s",
        (user_id, receiver_name, receiver_phone, zipcode, address, address_detail or ""),
    )
    if cur.fetchone():
        return
    cur.execute("SELECT COUNT(*) AS cnt FROM addresses WHERE user_id = %s", (user_id,))
    count = cur.fetchone()["cnt"]
    if count >= MAX_ADDRESSES:
        return
    cur.execute(
        "INSERT INTO addresses (user_id, receiver_name, receiver_phone, zipcode, address, address_detail, is_default) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (user_id, receiver_name, receiver_phone, zipcode, address, address_detail or None, 1 if count == 0 else 0),
    )


@router.get("")
def list_addresses(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, receiver_name, receiver_phone, zipcode, address, address_detail, is_default "
                "FROM addresses WHERE user_id = %s ORDER BY is_default DESC, id DESC",
                (user["id"],),
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    for r in rows:
        r["is_default"] = bool(r["is_default"])
    return rows


@router.put("/{address_id}/default")
def set_default(address_id: int, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM addresses WHERE id = %s AND user_id = %s", (address_id, user["id"]))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="배송지를 찾을 수 없습니다.")
            cur.execute("UPDATE addresses SET is_default = (id = %s) WHERE user_id = %s", (address_id, user["id"]))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"id": address_id, "is_default": True}


@router.delete("/{address_id}")
def delete_address(address_id: int, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_default FROM addresses WHERE id = %s AND user_id = %s", (address_id, user["id"]))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="배송지를 찾을 수 없습니다.")
            cur.execute("DELETE FROM addresses WHERE id = %s AND user_id = %s", (address_id, user["id"]))
            if row["is_default"]:      # 기본 배송지를 지웠으면 가장 최근 배송지를 기본으로
                cur.execute("UPDATE addresses SET is_default = 1 WHERE user_id = %s ORDER BY id DESC LIMIT 1", (user["id"],))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"deleted": address_id}
