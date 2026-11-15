import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Dialog from "../../components/Dialog";
import { adminListProducts, deleteProduct } from "../../api/admin";
import { toImagePath } from "../../utils/image";
import { won } from "../../utils/pricing";

const PAGE_SIZE = 10;
const STATUSES = [
  { value: "all", label: "전체" },
  { value: "active", label: "판매 중" },
  { value: "inactive", label: "판매중지" },
];
// 상품 관리 목록 (판매중지 포함). 등록 / 수정은 전용 화면(AdminProductFormPage), 삭제(판매중지)는 여기서 한다.
function AdminProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");      // 검색 버튼을 눌러 확정된 검색어
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);        // 저장/삭제 뒤 목록을 다시 불러오는 신호

  // 목록 상태 : 어떤 조건의 응답인지(key) 를 함께 보관해, 현재 조건과 다르면 "불러오는 중" 으로 본다
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const queryKey = [search, status, page, reload].join("|");
  const loading = state.key !== queryKey;

  const [removing, setRemoving] = useState(null); // 삭제 확인 중인 상품
  const [notice, setNotice] = useState(location.state?.notice ?? "");   // 등록 / 수정 뒤 돌아왔을 때의 안내

  useEffect(() => {
    let alive = true;
    adminListProducts({ keyword: search, status, page, size: PAGE_SIZE })
      .then((data) => alive && setState({ key: queryKey, data, error: "" }))
      .catch((e) => alive && setState({ key: queryKey, data: null, error: e.message }));
    return () => { alive = false; };
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = state.data?.items ?? [];
  const totalPages = state.data?.total_pages ?? 0;

  async function remove() {
    try {
      await deleteProduct(removing.id);
      setNotice(`"${removing.name}" 상품을 판매중지(삭제) 했습니다.`);
      setReload((n) => n + 1);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section>
      <div className="admin-toolbar">
        <form
          className="admin-search"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(keyword.trim()); }}
        >
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="상품명 검색" maxLength={50} />
          <button type="submit">검색</button>
        </form>
        <div className="admin-filters">
          {STATUSES.map((s) => (
            <button
              key={s.value} type="button"
              className={status === s.value ? "active" : ""}
              onClick={() => { setPage(1); setStatus(s.value); }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="admin-primary" onClick={() => navigate("/manage/products/new")}>+ 상품 등록</button>
      </div>

      {notice && <p className="admin-notice" role="status">{notice} <button type="button" onClick={() => setNotice("")}>닫기</button></p>}
      {state.key === queryKey && state.error && <p className="admin-message error">⚠️ {state.error}</p>}
      {loading && <p className="admin-message">불러오는 중...</p>}

      {!loading && !state.error && (
        <>
          <p className="admin-count">총 {state.data.total}개</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>번호</th><th>이미지</th><th>상품명</th><th>카테고리</th><th>가격</th><th>재고</th><th>상태</th><th></th></tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={8} className="empty">상품이 없습니다.</td></tr>}
                {items.map((p) => (
                  <tr key={p.id} className={p.is_active ? "" : "inactive"}>
                    <td>{p.id}</td>
                    <td><img className="admin-thumb" src={toImagePath(p.image_url, p.id, p.name)} alt="" /></td>
                    <td className="name">{p.name}{p.is_recommended ? <span className="badge reco">추천</span> : null}</td>
                    <td>{p.category_name ?? "-"}</td>
                    <td className="num">{won(p.price)}</td>
                    <td className={p.stock === 0 ? "num zero" : "num"}>{p.stock}</td>
                    <td>{p.is_active ? <span className="badge ok">판매 중</span> : <span className="badge off">판매중지</span>}</td>
                    <td className="actions">
                      <button type="button" onClick={() => navigate(`/manage/products/${p.id}/edit`)}>수정</button>
                      {p.is_active && <button type="button" className="danger" onClick={() => setRemoving(p)}>삭제</button>}
                    </td>
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

      {/* 삭제 확인 */}
      <Dialog
        open={removing !== null}
        title="상품을 삭제할까요?"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      >
        <p>"{removing?.name}" 상품은 <strong>판매중지</strong>로 바뀌어 목록과 검색에서 사라집니다.<br />지난 주문 내역은 그대로 남고, 수정에서 "판매 중"으로 되돌릴 수 있습니다.</p>
      </Dialog>
    </section>
  );
}

export default AdminProductsPage;
