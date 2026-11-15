import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { fetchProducts } from "../api/products";
import { toImagePath } from "../utils/image";
import "./ProductList.css";

// 상품 목록 화면
//   state 3개 : products(데이터), loading(불러오는 중?), error(오류 메시지)
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);   // 처음에는 "불러오는 중" 으로 시작한다
  const [error, setError] = useState(null);

  // 화면이 처음 나타날 때 한 번만(두 번째 인자 []) 서버에서 상품을 가져온다
  useEffect(() => {
    fetchProducts()
      .then((list) => {
        // 이미지가 없는 상품(image_url 이 null)은 임시 이미지로 바꿔 둔다
        setProducts(list.map((p) => ({ ...p, image_url: toImagePath(p.image_url, p.id, p.name) })));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="message">상품을 불러오는 중...</p>;
  if (error) return <p className="message error">⚠️ {error}</p>;
  if (products.length === 0) return <p className="message">판매 중인 상품이 없습니다.</p>;

  return (
    <div className="product-grid">
      {products.map((product) => (
        // key : React 가 목록의 각 항목을 구분하는 이름표 (상품 번호처럼 겹치지 않는 값)
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductList;
