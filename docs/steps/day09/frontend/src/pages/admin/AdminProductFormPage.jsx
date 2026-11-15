import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminGetProduct, createProduct, updateProduct } from "../../api/admin";
import { fetchCategories } from "../../api/products";

const EMPTY = {
  name: "", price: "", stock: "", category_id: "", description: "",
  is_active: true, is_recommended: false, recommend_rank: 0,
};

// 화면 주소 : /manage/products/new (등록), /manage/products/:id/edit (수정)
//   수정이면 상품을 먼저 불러온 뒤 폼을 보여 준다. (이미지는 10일차에 추가)
function AdminProductFormPage() {
  const { id } = useParams();
  const [state, setState] = useState({ id: null, product: null, error: "" });
  const [categories, setCategories] = useState([]);

  // 카테고리 목록 : 8일차에 만든 API 를 다시 쓴다
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // 수정이면 기존 상품 불러오기. alive : 화면을 떠난 뒤 도착한 응답은 무시한다
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
  return <ProductForm key={id ?? "new"} product={state.product} categories={categories} />;
}

function ProductForm({ product, categories }) {
  const navigate = useNavigate();
  const editing = Boolean(product);

  // 입력값은 모두 하나의 객체(form)로 관리한다. 숫자 칸도 입력 중에는 글자로 들고 있다가 저장할 때 숫자로 바꾼다.
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name, price: String(product.price), stock: String(product.stock),
          category_id: product.category_id ?? "", description: product.description ?? "",
          is_active: product.is_active, is_recommended: product.is_recommended, recommend_rank: product.recommend_rank,
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 입력칸 하나를 바꾸는 함수 : set("name", "콜라")
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  async function save() {
    setError("");
    // ---- 화면에서 먼저 확인 (서버도 같은 검사를 한다) ----
    if (!form.name.trim()) return setError("상품명을 입력해 주세요.");
    const price = Number(form.price), stock = Number(form.stock);
    if (form.price === "" || !Number.isInteger(price) || price < 0) return setError("가격은 0 이상의 정수로 입력해 주세요.");
    if (form.stock === "" || !Number.isInteger(stock) || stock < 0) return setError("재고는 0 이상의 정수로 입력해 주세요.");

    const body = {
      name: form.name.trim(), price, stock,
      category_id: form.category_id === "" ? null : Number(form.category_id),
      description: form.description.trim() || null,
      image_url: product?.image_url ?? null,
      is_active: form.is_active, is_recommended: form.is_recommended,
      recommend_rank: Number(form.recommend_rank) || 0,
    };

    setSaving(true);
    try {
      if (editing) await updateProduct(product.id, body);   // PUT  /products/{id}
      else await createProduct(body);                       // POST /products
    } catch (e) {
      setSaving(false);
      return setError(e.message);
    }
    // 목록으로 돌아가면서 "저장했습니다" 안내를 넘긴다
    navigate("/manage/products", { state: { notice: editing ? "상품을 수정했습니다." : "상품을 등록했습니다." } });
  }

  return (
    <section>
      <Link to="/manage/products" className="img-back">← 상품 목록</Link>
      <h3 className="form-title">{editing ? `상품 수정 (#${product.id})` : "상품 등록"}</h3>

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
