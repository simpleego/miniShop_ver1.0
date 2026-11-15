import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { adminGetProduct, createProduct, updateProduct, saveProductImages } from "../../api/admin";
import { fetchCategories } from "../../api/products";
import { revokeAllPreviews, newDetailKey } from "../../utils/imageFile";
import MainImagesEditor from "./MainImagesEditor";
import DetailImagesEditor from "./DetailImagesEditor";

const EMPTY = {
  name: "", price: "", stock: "", category_id: "", description: "",
  is_active: true, is_recommended: false, recommend_rank: 0,
};

// 화면 주소 : /manage/products/new (등록), /manage/products/:id/edit (수정)
//   수정이면 상품(기본 정보 + 이미지 주소)을 먼저 불러온 뒤 폼을 보여 준다.
function AdminProductFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ id: null, product: null, error: "" });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    adminGetProduct(id)
      .then((product) => alive && setState({ id, product, error: "" }))
      .catch((e) => alive && setState({ id, product: null, error: e.message }));
    return () => { alive = false; };
  }, [id]);

  if (id && state.id !== id) return <p className="admin-message">불러오는 중...</p>;
  if (id && state.error) return (
    <>
      <p className="admin-message error">⚠️ {state.error}</p>
      <p className="admin-message"><Link to="/manage/products">← 상품 목록으로</Link></p>
    </>
  );
  // key : 다른 상품으로 바뀌면 폼을 새로 만든다
  return <ProductForm key={id ?? "new"} product={state.product} categories={categories} notice={location.state?.notice} />;
}

// 최종 모습(layout) 만들기 : 기존 이미지는 keep, 새 파일은 new(파일 번호)
function buildMainLayout(slots, files) {
  return slots.map((s) => {
    if (s.file) { files.push(s.file); return { new: files.length - 1 }; }
    return s.original ? { keep: s.original } : null;
  });
}
function buildDetailLayout(items, files) {
  return items.map((it) => {
    if (it.file) { files.push(it.file); return { new: files.length - 1 }; }
    return { keep: it.original };
  });
}

function ProductForm({ product, categories, notice }) {
  const navigate = useNavigate();
  const editing = Boolean(product);

  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name, price: String(product.price), stock: String(product.stock),
          category_id: product.category_id ?? "", description: product.description ?? "",
          is_active: product.is_active, is_recommended: product.is_recommended, recommend_rank: product.recommend_rank,
        }
      : EMPTY
  );
  const [slots, setSlots] = useState(() =>
    Array.from({ length: 3 }, (_, i) => {
      const url = product?.gallery_images?.[i] ?? "";
      return { src: url, file: null, original: url };
    })
  );
  const [details, setDetails] = useState(() =>
    (product?.detail_images ?? []).map((url) => ({ key: newDetailKey(), src: url, file: null, name: url.split("/").pop(), original: url }))
  );
  const [tab, setTab] = useState("basic");
  const [error, setError] = useState(notice ?? "");
  const [saving, setSaving] = useState(false);

  // 처음 불러온 이미지 모습 (바뀌었는지 비교하려고 JSON 글자로 보관)
  const [initialMain] = useState(() => JSON.stringify(slots.map((s) => (s.original ? { keep: s.original } : null))));
  const [initialDetail] = useState(() => JSON.stringify(details.map((d) => ({ keep: d.original }))));

  // 화면을 떠날 때 새로 고른 파일의 미리보기 주소를 반납한다
  useEffect(() => revokeAllPreviews, []);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const mainCount = slots.filter((s) => s.src).length;

  function fail(message, goTab) {
    setError(message);
    if (goTab) setTab(goTab);
  }

  async function save() {
    setError("");
    // ---- 화면에서 먼저 확인 (서버도 같은 검사를 한다) ----
    if (!form.name.trim()) return fail("상품명을 입력해 주세요.", "basic");
    const price = Number(form.price), stock = Number(form.stock);
    if (form.price === "" || !Number.isInteger(price) || price < 0) return fail("가격은 0 이상의 정수로 입력해 주세요.", "basic");
    if (form.stock === "" || !Number.isInteger(stock) || stock < 0) return fail("재고는 0 이상의 정수로 입력해 주세요.", "basic");

    const files = [];
    const mainLayout = buildMainLayout(slots, []);          // 변경 여부 확인용 (파일 번호는 아직 의미 없음)
    const mainChanged = slots.some((s) => s.file) || JSON.stringify(mainLayout) !== initialMain;
    const detailChanged = details.some((d) => d.file) || JSON.stringify(buildDetailLayout(details, [])) !== initialDetail;
    if (mainChanged && mainCount === 0) return fail("대표 이미지는 1장 이상 필요합니다.", "main");
    if (!editing && mainCount === 0) return fail("대표 이미지 1을 등록해 주세요.", "main");

    const body = {
      name: form.name.trim(), price, stock,
      category_id: form.category_id === "" ? null : Number(form.category_id),
      description: form.description.trim() || null,
      image_url: product?.image_url ?? null,                 // 이미지 주소는 이미지 저장(썸네일 생성)이 정한다
      is_active: form.is_active, is_recommended: form.is_recommended,
      recommend_rank: Number(form.recommend_rank) || 0,
    };

    setSaving(true);
    let productId = product?.id;
    try {
      // ① 기본 정보 저장
      if (editing) await updateProduct(productId, body);
      else productId = (await createProduct(body)).id;
    } catch (e) {
      setSaving(false);
      return fail(e.message);
    }

    try {
      // ② 이미지 저장 (바뀐 것만)
      if (mainChanged || detailChanged) {
        await saveProductImages(productId, {
          mainLayout: mainChanged ? buildMainLayout(slots, files) : null,
          detailLayout: detailChanged ? buildDetailLayout(details, files) : null,
          files,
        });
      }
    } catch (e) {
      setSaving(false);
      // 상품 정보는 이미 저장되었다. 새로 등록한 경우 수정 화면으로 옮겨 이미지만 다시 시도하게 한다.
      const message = `상품 정보는 저장되었지만 이미지 저장에 실패했습니다. (${e.message}) 이미지를 다시 선택해 저장해 주세요.`;
      if (!editing) navigate(`/manage/products/${productId}/edit`, { replace: true, state: { notice: message } });
      else fail(message);
      return;
    }
    navigate("/manage/products", { state: { notice: editing ? "상품을 수정했습니다." : "상품을 등록했습니다." } });
  }

  return (
    <section>
      <Link to="/manage/products" className="img-back">← 상품 목록</Link>
      <h3 className="form-title">{editing ? `상품 수정 (#${product.id})` : "상품 등록"}</h3>

      <nav className="admin-subtabs">
        <button type="button" className={tab === "basic" ? "active" : ""} onClick={() => setTab("basic")}>기본 정보</button>
        <button type="button" className={tab === "main" ? "active" : ""} onClick={() => setTab("main")}>대표 이미지 ({mainCount}/3)</button>
        <button type="button" className={tab === "detail" ? "active" : ""} onClick={() => setTab("detail")}>상세 이미지 ({details.length})</button>
      </nav>

      {tab === "basic" && (
        <div className="admin-form form-card">
          <label>상품명 *<input value={form.name} maxLength={50} onChange={(e) => set("name", e.target.value)} /></label>
          <div className="row">
            <label>가격(원) *<input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
            <label>재고(개) *<input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></label>
          </div>
          <label>카테고리
            <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">미분류</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>설명<input value={form.description} maxLength={255} onChange={(e) => set("description", e.target.value)} /></label>
          <div className="row checks">
            <label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />판매 중</label>
            <label className="check"><input type="checkbox" checked={form.is_recommended} onChange={(e) => set("is_recommended", e.target.checked)} />추천 상품</label>
            <label>추천 순서<input type="number" min="0" max="9999" value={form.recommend_rank} onChange={(e) => set("recommend_rank", e.target.value)} /></label>
          </div>
        </div>
      )}

      {/* 탭을 옮겨 다녀도 고른 파일이 유지되도록 숨기기만 한다 (상태는 이 폼이 가진다) */}
      <div hidden={tab !== "main"}>
        <MainImagesEditor slots={slots} onChange={setSlots} productName={form.name.trim()} />
      </div>
      <div hidden={tab !== "detail"}>
        <DetailImagesEditor items={details} onChange={setDetails} />
      </div>

      {error && <p className="admin-form-error form-error" role="alert">{error}</p>}
      <div className="img-actions">
        <button type="button" className="form-cancel" disabled={saving} onClick={() => navigate("/manage/products")}>취소</button>
        <button type="button" className="admin-primary" disabled={saving} onClick={save}>
          {saving ? "저장 중..." : editing ? "수정 저장" : "상품 등록"}
        </button>
      </div>
    </section>
  );
}

export default AdminProductFormPage;
