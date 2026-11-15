"""동시 주문 실험 (5일차) : 같은 상품을 여러 명이 "동시에" 주문하면 어떻게 될까?

사용법 (backend 폴더에서, 서버(8000)가 켜져 있어야 한다)
    python race_test.py                  # 기본 : 상품 10번, 재고 10개, 20명이 동시에 1개씩 주문
    python race_test.py 10 10 20         # 상품번호  재고  동시 주문자 수

기대하는 올바른 결과
    성공 = 재고 수(10건), 실패(재고 부족) = 나머지(10건), 최종 재고 = 0
※ 이 스크립트는 DB 의 해당 상품 재고를 바꾸고, 주문 기록을 남긴다. (연습용 DB 에서만 실행한다)
"""
import json
import sys
import threading
import urllib.error
import urllib.request

from app.database import get_connection

BASE = "http://localhost:8000"

product_id = int(sys.argv[1]) if len(sys.argv) > 1 else 10
stock = int(sys.argv[2]) if len(sys.argv) > 2 else 10
workers = int(sys.argv[3]) if len(sys.argv) > 3 else 20


def db_one(sql, params=()):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    finally:
        conn.close()


def db_run(sql, params=()):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
    finally:
        conn.close()


def order_one():
    """주문 1건 (상품 1개). 결과 : HTTP 상태 코드"""
    body = json.dumps({"items": [{"product_id": product_id, "quantity": 1}]}).encode()
    req = urllib.request.Request(BASE + "/orders", data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status
    except urllib.error.HTTPError as e:
        return e.code


# ---- 준비 : 재고를 정해 두고, 이전 실험의 판매량을 기억해 둔다
db_run("UPDATE products SET stock = %s WHERE id = %s", (stock, product_id))
before = db_one("SELECT COALESCE(SUM(quantity), 0) AS n FROM order_items WHERE product_id = %s", (product_id,))["n"]
print(f"상품 {product_id}번 재고 {stock}개, {workers}명이 동시에 1개씩 주문합니다...")

# ---- 실행 : 모든 주문자가 준비될 때까지 기다렸다가(barrier) 한꺼번에 출발
barrier = threading.Barrier(workers)
codes = []


def worker():
    barrier.wait()
    codes.append(order_one())


threads = [threading.Thread(target=worker) for _ in range(workers)]
for t in threads:
    t.start()
for t in threads:
    t.join()

# ---- 결과
ok = codes.count(201)
no_stock = codes.count(409)
other = len(codes) - ok - no_stock
final = db_one("SELECT stock FROM products WHERE id = %s", (product_id,))["stock"]
sold = db_one("SELECT COALESCE(SUM(quantity), 0) AS n FROM order_items WHERE product_id = %s", (product_id,))["n"] - before

print()
print(f"주문 성공(201)     : {ok}건   (올바른 값 {min(stock, workers)})")
print(f"재고 부족(409)     : {no_stock}건   (올바른 값 {max(workers - stock, 0)})")
if other:
    print(f"그 밖의 응답        : {other}건  {sorted(set(codes) - {201, 409})}")
print(f"실제로 팔린 수량   : {sold}개   (재고가 {stock}개였으니 {stock}개를 넘으면 안 된다)")
print(f"최종 재고          : {final}개   (올바른 값 {max(stock - workers, 0)})")
print()
if sold > stock:
    print(f"[문제] 초과 판매! 재고는 {stock}개인데 {sold}개를 팔았습니다.")
elif final != stock - sold:
    print(f"[문제] 재고 계산이 어긋났습니다. (팔린 {sold}개 → 재고는 {stock - sold}개여야 하는데 {final}개)")
else:
    print("[정상] 재고가 정확합니다.")
