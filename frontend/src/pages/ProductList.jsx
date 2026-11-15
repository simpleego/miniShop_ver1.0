import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { searchProducts, fetchSortOptions } from "../api/products";
import { toImagePath } from "../utils/image";
import "./ProductList.css";

const PAGE_SIZE = 12;

// "상품평 많은순" 은 상품평 데이터가 아직 없어 제외했다.
// 서버 목록을 못 받았을 때 쓰는 기본 정렬 옵션
const FALLBACK_SORTS = [
    { value: "recommend", label: "추천순" },
    { value: "popular", label: "판매 인기순" },
    { value: "price_low", label: "낮은 가격순" },
    { value: "price_high", label: "높은 가격순" },
    { value: "newest", label: "신규 상품순" },
];

// 결과 내 재검색 입력칸
function SubSearch({ initial, onSubmit }) {
    const [value, setValue] = useState(initial);
    return (
        <form
            className="sub-search"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(value.trim());
            }}
        >
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="결과 내 재검색" maxLength={50} />
            <button type="submit">검색</button>
        </form>
    );
}

// 상품 목록 + 검색 화면
//   검색 조건(카테고리, 검색어, 2차 검색어, 정렬, 페이지)은 모두 주소의 ?쿼리 에 담는다.
//   → 새로고침해도 유지되고, 뒤로가기/링크 공유가 된다.
function ProductList() {
    const [params, setParams] = useSearchParams();
    const categoryId = params.get("category_id") ?? "";
    const keyword = params.get("keyword") ?? "";
    const subKeyword = params.get("sub_keyword") ?? "";
    const sort = params.get("sort") ?? "recommend";
    const page = Math.max(1, Number(params.get("page")) || 1);

    // 서버 응답과 "어떤 조건의 응답인지"(key) 를 함께 보관한다. 현재 조건과 key 가 다르면 로딩 중이다.
    const [state, setState] = useState({ key: null, data: null, error: null });
    const queryKey = [categoryId, keyword, subKeyword, sort, page].join("|");
    const loading = state.key !== queryKey;
    const result = state.data;
    const error = state.key === queryKey ? state.error : null;
    const [showStock, setShowStock] = useState(false);
    const [sorts, setSorts] = useState(FALLBACK_SORTS);
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef(null);

    // 정렬 옵션 목록 (한 번만)
    useEffect(() => {
        const controller = new AbortController();
        fetchSortOptions(controller.signal)
            .then((list) => list.length && setSorts(list))
            .catch(() => {});
        return () => controller.abort();
    }, []);

    // 검색 조건이 바뀔 때마다 서버에서 다시 검색
    useEffect(() => {
        const controller = new AbortController();
        searchProducts(
            { category_id: categoryId, keyword, sub_keyword: subKeyword, sort, page, size: PAGE_SIZE },
            controller.signal
        )
            .then((data) => {
                setState({
                    key: queryKey,
                    error: null,
                    data: {
                        ...data,
                        items: data.items.map((p) => ({ ...p, image_url: toImagePath(p.image_url, p.id, p.name) })),
                    },
                });
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                setState({ key: queryKey, data: null, error: err.message });
            });
        return () => controller.abort();
    }, [queryKey]);  // eslint-disable-line react-hooks/exhaustive-deps

    // 드롭다운 바깥을 누르면 닫는다
    useEffect(() => {
        const close = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // 주소 쿼리 일부를 바꾼다. 조건이 바뀌면 1페이지로 돌아간다.
    const update = (changes, keepPage = false) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        if (!keepPage) next.delete("page");
        setParams(next);
    };

    const currentSortLabel = sorts.find((s) => s.value === sort)?.label ?? "추천순";
    const items = result?.items ?? [];
    const totalPages = result?.total_pages ?? 0;

    return (
        <>
            <div className="search-bar">
                <div className="search-summary">
                    {keyword && <span className="chip">"{keyword}"</span>}
                    {subKeyword && (
                        <span className="chip">
                            결과 내: "{subKeyword}"
                            <button type="button" aria-label="결과 내 검색어 지우기" onClick={() => update({ sub_keyword: "" })}>×</button>
                        </span>
                    )}
                    <span className="total">{result ? `총 ${result.total}개` : ""}</span>
                </div>

                {/* key : 주소의 2차 검색어가 바뀌면(카테고리 이동 등) 입력칸을 새로 만들어 값을 맞춘다 */}
                <SubSearch key={subKeyword} initial={subKeyword} onSubmit={(v) => update({ sub_keyword: v })} />

                <div className="sort-box" ref={sortRef}>
                    <button
                        type="button"
                        className={sortOpen ? "sort-toggle open" : "sort-toggle"}
                        aria-haspopup="listbox"
                        aria-expanded={sortOpen}
                        onClick={() => setSortOpen((o) => !o)}
                    >
                        {currentSortLabel}
                        <span className="caret">{sortOpen ? "⌃" : "⌄"}</span>
                    </button>
                    {sortOpen && (
                        <ul className="sort-menu" role="listbox">
                            {sorts.map((s) => (
                                <li key={s.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={s.value === sort}
                                        className={s.value === sort ? "selected" : ""}
                                        onClick={() => {
                                            setSortOpen(false);
                                            update({ sort: s.value === "recommend" ? "" : s.value });
                                        }}
                                    >
                                        {s.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <label className="stock-toggle">
                    <input type="checkbox" checked={showStock} onChange={(e) => setShowStock(e.target.checked)} />
                    재고 표시
                </label>
            </div>

            {loading && <p className="message">상품을 불러오는 중...</p>}
            {error && <p className="message error">⚠️ {error}</p>}
            {!loading && !error && items.length === 0 && (
                <p className="message">조건에 맞는 상품이 없습니다.</p>
            )}

            {!error && items.length > 0 && (
                <div className={loading ? "product-grid loading" : "product-grid"}>
                    {items.map((product) => (
                        <ProductCard key={product.id} product={product} showStock={showStock} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <nav className="pagination" aria-label="페이지">
                    <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, true)}>이전</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                            key={n}
                            type="button"
                            className={n === page ? "active" : ""}
                            onClick={() => update({ page: String(n) }, true)}
                        >
                            {n}
                        </button>
                    ))}
                    <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, true)}>다음</button>
                </nav>
            )}
        </>
    );
}

export default ProductList;
