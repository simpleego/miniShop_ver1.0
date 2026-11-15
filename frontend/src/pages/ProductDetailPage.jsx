import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProductDetail } from "../api/products";
import { toImagePath } from "../utils/image";
import ProductDetail from "./ProductDetail";
import "./ProductDetail.css";

// 상품 1개를 불러와서 보여 주는 부분
//   바깥에서 key={id} 로 만들기 때문에, 다른 상품으로 이동하면 이 컴포넌트가 새로 만들어지고
//   product / error 상태도 자동으로 처음 값(null)으로 돌아간다. (effect 안에서 초기화할 필요가 없다)
function ProductDetailLoader({ id }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductDetail(id, controller.signal)
      .then((p) => {
        const name = p.name;
        setProduct({
          ...p,
          name,
          image_url: toImagePath(p.image_url, p.id, name),
          gallery_images: (p.gallery_images ?? []).map((url) => toImagePath(url)),
          detail_images: (p.detail_images ?? []).map((url) => toImagePath(url)),
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // 취소된 요청은 에러가 아님
        setError(err.message);
      });

    // 화면을 떠나면 진행 중인 요청을 취소한다
    return () => controller.abort();
  }, [id]);

  if (error) return <p className="detail-message error">⚠️ {error}</p>;
  if (!product) return <p className="detail-message">상품을 불러오는 중...</p>;

  // key : 상품이 바뀌면 ProductDetail 을 새로 만들어 수량이 1 로 초기화되게 한다
  return <ProductDetail key={product.id} product={product} />;
}

// 상품 상세 "페이지" : 주소의 id 를 읽어 ProductDetailLoader 에 넘긴다
//   ProductDetail 은 product 를 props 로 받아 그리기만 하고, 데이터 요청은 Loader 가 맡는다.
function ProductDetailPage() {
  // 주소 /product/:id 의 :id 값 (항상 문자열)
  const { id } = useParams();

  return (
    <div className="detail-page">
      <Link to="/" className="detail-back">← 목록으로</Link>
      <ProductDetailLoader key={id} id={id} />
    </div>
  );
}

export default ProductDetailPage;
