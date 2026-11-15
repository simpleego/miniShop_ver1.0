import { useEffect, useState } from "react";
import Dialog from "../../components/Dialog";
import { adminListOrders, adminGetOrder, refundOrder } from "../../api/admin";
import { won } from "../../utils/pricing";

const PAGE_SIZE = 10;
// 용어 : 주문 = 결제 전, 구매 = 결제 완료(환불 제외)
const STATUS_LABEL = { PENDING: "주문(결제 전)", PAID: "구매", REFUNDED: "환불", CANCELLED: "취소" };
const FILTERS = [{ value: "", label: "전체" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))];

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";

// 주문 관리 : 전체 회원의 주문 목록 / 상세 / 환불
function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const queryKey = [status, search, page, reload].join("|");
  const loading = state.key !== queryKey;

  const [detail, setDetail] = useState(null);     // 상세 대화상자에 보여 줄 주문
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    adminListOrders({ status, keyword: search, page, size: PAGE_SIZE })
      .then((data) => alive && setState({ key: queryKey, data, error: "" }))
      .catch((e) => alive && setState({ key: queryKey, data: null, error: e.message }));
    return () => { alive = false; };
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = state.data?.items ?? [];
  const totalPages = state.data?.total_pages ?? 0;

  async function openDetail(id) {
    try {
      setDetail(await adminGetOrder(id));
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function doRefund() {
    const id = detail.order_id;
    setConfirming(false);
    try {
      await refundOrder(id);
      setNotice(`주문 #${id} 을(를) 환불했습니다. 재고가 복구되었고 구매내역에서 제외됩니다.`);
      setReload((n) => n + 1);
      setDetail(await adminGetOrder(id));
    } catch (e) {
      setNotice(e.message);
      setReload((n) => n + 1);
    }
  }

  return (
    <section>
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(keyword.trim()); }}>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="주문번호 / 이메일 / 이름" maxLength={100} />
          <button type="submit">검색</button>
        </form>
        <div className="admin-filters">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={status === f.value ? "active" : ""} onClick={() => { setPage(1); setStatus(f.value); }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {notice && <p className="admin-notice" role="status">{notice} <button type="button" onClick={() => setNotice("")}>닫기</button></p>}
      {state.key === queryKey && state.error && <p className="admin-message error">⚠️ {state.error}</p>}
      {loading && <p className="admin-message">불러오는 중...</p>}

      {!loading && !state.error && (
        <>
          <p className="admin-count">총 {state.data.total}건</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>주문번호</th><th>주문 시각</th><th>회원</th><th>상품</th><th>금액</th><th>상태</th><th></th></tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="empty">주문이 없습니다.</td></tr>}
                {items.map((o) => (
                  <tr key={o.order_id}>
                    <td>#{o.order_id}</td>
                    <td>{formatDate(o.created_at)}</td>
                    <td>{o.user_name}<br /><small>{o.email}</small></td>
                    <td className="name">{o.item_count > 1 ? `${o.first_product_name} 외 ${o.item_count - 1}건` : o.first_product_name}</td>
                    <td className="num">{won(o.total_price)}</td>
                    <td><span className={`badge st-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                    <td className="actions"><button type="button" onClick={() => openDetail(o.order_id)}>상세</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav className="admin-pagination" aria-label="페이지">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button>
              <span>{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
            </nav>
          )}
        </>
      )}

      {/* 주문 상세 */}
      <Dialog
        open={detail !== null && !confirming}
        className="wide"
        title={detail ? `주문 #${detail.order_id} · ${STATUS_LABEL[detail.status]}` : ""}
        confirmText={detail?.status === "PAID" ? "환불하기" : "닫기"}
        cancelText={detail?.status === "PAID" ? "닫기" : undefined}
        onConfirm={() => (detail?.status === "PAID" ? setConfirming(true) : setDetail(null))}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <div className="admin-detail">
            <p><strong>회원</strong> {detail.user_name} ({detail.email})</p>
            <p><strong>주문</strong> {formatDate(detail.created_at)} · <strong>결제</strong> {formatDate(detail.paid_at)}
              {detail.refunded_at && <> · <strong>환불</strong> {formatDate(detail.refunded_at)}</>}</p>
            <ul className="admin-items">
              {detail.items.map((it) => (
                <li key={it.product_id}>
                  <span>{it.product_name} × {it.quantity}</span>
                  <span>{won(Number(it.line_total))}</span>
                </li>
              ))}
              <li className="total"><span>합계</span><span>{won(detail.total_price)}</span></li>
            </ul>
            {detail.receiver_name ? (
              <p>
                <strong>배송지</strong> {detail.receiver_name} / {detail.receiver_phone}<br />
                {detail.zipcode && `(${detail.zipcode}) `}{detail.address} {detail.address_detail}
                {detail.request_memo && <><br />요청사항: {detail.request_memo}</>}
              </p>
            ) : <p><strong>배송지</strong> 정보 없음</p>}
          </div>
        )}
      </Dialog>

      {/* 환불 확인 */}
      <Dialog
        open={confirming}
        title="환불할까요?"
        confirmText="환불"
        cancelText="취소"
        onConfirm={doRefund}
        onCancel={() => setConfirming(false)}
      >
        <p>주문 #{detail?.order_id} ({detail && won(detail.total_price)}) 을(를) 환불합니다.<br />환불하면 <strong>구매가 아닌 것</strong>으로 바뀌어 구매내역에서 빠지고, 상품 재고가 되돌아갑니다.</p>
      </Dialog>
    </section>
  );
}

export default AdminOrdersPage;
