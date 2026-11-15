import "./ProductCard.css";

// props: product (상품 1개 : { id, name, price, stock, image_url })
function ProductCard({ product }) {
  const soldOut = product.stock === 0;

  return (
    <div className={soldOut ? "card sold-out" : "card"}>
      <img className="card-image" src={product.image_url} alt={product.name} />
      <h3 className="card-name">{product.name}</h3>
      {/* toLocaleString() : 1500 → "1,500" */}
      <p className="card-price">{product.price.toLocaleString()}원</p>
      <p className="card-stock">{soldOut ? "품절" : `재고 ${product.stock}개`}</p>
    </div>
  );
}

export default ProductCard;
