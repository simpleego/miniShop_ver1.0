import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthContext } from "../context/authContext";
import { fetchOrderDetail, fetchPurchases } from "../api/purchases";
import { won } from "../utils/pricing";
import "./PurchasesPage.css";

const PAGE_SIZE = 10;
const PERIODS = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
];

// 결제 시각을 "2026. 11. 15. 오전 10:20" 모양으로
const formatDate = (iso) =>
  new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

// 구매 1건 : 누르면 상품 목록과 배송지를 펼쳐 보여 준다 (펼칠 때 상세를 한 번만 불러온다)
function PurchaseItem({ purchase }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setError("");
      fetchOrderDetail(purchase.order_id).then(setDetail).catch((e) => setError(e.message));
    }
  }

  const title =
    purchase.item_count > 1 ? `${purchase.first_product_name} 외 ${purchase.item_count - 1}건` : purchase.first_product_name;

  return (
    <li className="purchase-item">
      <button type="button" className="purchase-head" aria-expanded={open} onClick={toggle}>
        <span className="purchase-info">
          <strong>{title}</strong>
          <span>{formatDate(purchase.paid_at)} · 주문번호 {purchase.order_id}</span>
        </span>
        <span className="purchase-price">{won(purchase.total_price)}</span>
        <span className={open ? "purchase-arrow open" : "purchase-arrow"} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div className="purchase-detail">
          {error && <p className="purchase-error">{error}</p>}
          {!detail && !error && <p className="purchase-loading">불러오는 중...</p>}
          {detail && (
            <>
              <ul className="purchase-lines">
                {detail.items.map((it) => (
                  <li key={it.product_id}>
                    <Link to={`/product/${it.product_id}`}>{it.product_name}</Link>
                    <span>{won(it.unit_price)} × {it.quantity}개</span>
                    <strong>{won(it.line_total)}</strong>
                  </li>
                ))}
              </ul>
              {detail.address && (
                <p className="purchase-ship">
                  <b>배송지</b> {detail.receiver_name} · {detail.receiver_phone}
                  <br />
                  {detail.zipcode && `(${detail.zipcode}) `}
                  {detail.address} {detail.address_detail}
                  {detail.request_memo && <><br />요청사항 : {detail.request_memo}</>}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

// 기간별 구매내역 목록 : 기간이 바뀌면 key 가 바뀌어 처음부터 다시 불러온다
function PurchaseList({ period }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function apply(list, nextPage) {
    setItems((prev) => (nextPage === 1 ? list : [...prev, ...list]));
    setPage(nextPage);
    setHasMore(list.length === PAGE_SIZE);   // 가득 찼으면 다음 페이지가 더 있을 수 있다
    setLoading(false);
  }

  useEffect(() => {
    fetchPurchases(period, 1, PAGE_SIZE)
      .then((list) => apply(list, 1))
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [period]);

  function handleMore() {
    setLoading(true);
    fetchPurchases(period, page + 1, PAGE_SIZE)
      .then((list) => apply(list, page + 1))
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }

  if (error) return <p className="purchase-error">{error}</p>;
  if (loading && items.length === 0) return <p className="purchase-loading">불러오는 중...</p>;
  if (items.length === 0) {
    return (
      <div className="purchase-empty">
        <p>이 기간의 구매내역이 없습니다.</p>
        <Link to="/">쇼핑하러 가기</Link>
      </div>
    );
  }

  return (
    <>
      <ul className="purchase-list">
        {items.map((p) => (
          <PurchaseItem key={p.order_id} purchase={p} />
        ))}
      </ul>
      {hasMore && (
        <button type="button" className="purchase-more" onClick={handleMore} disabled={loading}>
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </>
  );
}

// 구매내역 화면 : 로그인한 회원의 결제 완료(구매) 목록. 기본은 최근 1년.
function PurchasesPage() {
  const { user, ready } = useAuthContext();
  const [period, setPeriod] = useState("1y");

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: "/mypage/purchases" }} />;

  return (
    <div className="purchases-page">
      <h2 className="purchases-title">구매내역</h2>
      <p className="purchases-sub">결제가 완료된 구매만 보여 줍니다. (환불된 주문은 제외)</p>

      <div className="purchases-periods" role="group" aria-label="기간 선택">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={p.value === period ? "period-btn on" : "period-btn"}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <PurchaseList key={period} period={period} />
    </div>
  );
}

export default PurchasesPage;
