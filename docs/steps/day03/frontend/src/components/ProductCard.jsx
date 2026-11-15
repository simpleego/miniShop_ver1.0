import { Link } from "react-router-dom";
import "./ProductCard.css";

// 이 값 이하이면 "재고 N개 남음" 으로 알려준다
const LOW_STOCK_THRESHOLD = 20;

// 재고 문구를 결정한다. 표시할 게 없으면 null
function getStockLabel(stock) {
  if (stock === 0) return "품절";
  if (stock <= LOW_STOCK_THRESHOLD) return `재고 ${stock}개 남음`;
  return null;
}

// props: product (상품 1개 : { id, name, price, stock, image_url })
function ProductCard({ product }) {
  const soldOut = product.stock === 0;
  const stockLabel = getStockLabel(product.stock);

  // 카드 전체를 링크로 감싸서 클릭하면 /product/{id} (상세 화면) 으로 이동한다
  // 품절 상품도 상세 정보는 볼 수 있어야 하므로 링크를 막지 않는다
  return (
    <Link to={`/product/${product.id}`} className="card-link">
      <div className={soldOut ? "card sold-out" : "card"}>
        <img className="card-image" src={product.image_url} alt={product.name} />
        <h3 className="card-name">{product.name}</h3>
        <p className="card-price">{product.price.toLocaleString()}원</p>
        {/* 문구가 없어도 줄 높이는 유지해서 카드 높이가 들쭉날쭉해지지 않게 한다 ("\u00A0" = 눈에 안 보이는 공백) */}
        <p className="card-stock">{stockLabel ?? "\u00A0"}</p>
      </div>
    </Link>
  );
}

export default ProductCard;
