import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clampQuantity } from "../utils/quantity";
import { useCartContext } from "../context/cartContext";
import Dialog from "../components/Dialog";
import CartPlusIcon from "../components/CartPlusIcon";
import "./ProductDetail.css";

// props: product(상품 정보 객체)
function ProductDetail({ product }) {
  // ① state : 원본은 수량 하나뿐
  const [quantity, setQuantity] = useState(1);
  // 지금 대표 이미지로 보여 주는 이미지의 순서 (0 = 첫 번째)
  const [imageIndex, setImageIndex] = useState(0);
  // "상세 보기" 버튼으로 상세 이미지를 펼쳤는지 (처음에는 접혀 있다)
  const [detailOpen, setDetailOpen] = useState(false);
  // 열려 있는 대화상자 : null(없음) | "added"(담았습니다) | "stock"(재고 부족)
  const [dialog, setDialog] = useState(null);
  // 코드로 화면(주소)을 이동시키는 함수 : navigate("/cart") → 장바구니 화면
  const navigate = useNavigate();
  // 앱 전체가 공유하는 장바구니
  const { addToCart, getQuantity } = useCartContext();

  const soldOut = product.stock === 0;

  // ── 이미지 ──
  // gallery_images : 대표 이미지 + 썸네일 (DB 의 product_images, GALLERY)
  // 등록된 이미지가 없으면 목록에서 쓰던 대표 이미지(image_url) 한 장만 보여 준다
  const gallery = product.gallery_images ?? [];
  const images = gallery.length > 0 ? gallery : [product.image_url];
  const mainImage = images[imageIndex] ?? images[0];
  // detail_images : "상세 보기" 에 이어 붙여 보여 줄 상세 이미지 (DETAIL)
  const detailImages = product.detail_images ?? [];

  // ② 계산값 : state 가 아니라 렌더링할 때마다 계산한다
  const itemAmount = product.price * quantity;
  const totalAmount = itemAmount;

  // ③ 수량 변경 핸들러
  function handleMinus() {
    setQuantity(clampQuantity(quantity - 1, product.stock));
  }

  function handlePlus() {
    setQuantity(clampQuantity(quantity + 1, product.stock));
  }

  function handleInput(e) {
    // input 의 값은 문자열이므로 숫자로 바꿔서 보정한다
    setQuantity(clampQuantity(parseInt(e.target.value, 10), product.stock));
  }

  // 장바구니 담기
  // 이미 담긴 수량 (렌더링할 때마다 장바구니에서 읽는다)
  const inCart = getQuantity(product.id);

  // 장바구니 버튼 : 바로 담고, 결과 대화상자를 연다
  //    이미 담긴 수량 + 이번 수량이 재고를 넘으면 담지 않고 "재고 부족" 안내
  function handleAddToCart() {
    if (inCart + quantity > product.stock) {
      setDialog("stock");
      return;
    }

    addToCart(product, quantity);
    setDialog("added");
  }

  // [장바구니로] : 대화상자를 닫고 장바구니 화면(/cart)으로 이동한다
  function handleGoCart() {
    setDialog(null);
    navigate("/cart");
  }

  // 구매하기 : 장바구니를 거치지 않고, 이 상품 1개와 지금 고른 수량으로 바로 주문결제 화면을 연다
  //   장바구니에는 담지 않는다. (장바구니에 이미 담긴 같은 상품도 건드리지 않는다)
  //   주문결제 화면은 장바구니 항목과 같은 모양의 객체 한 개를 directItem 으로 받는다.
  function handleBuyNow() {
    navigate("/checkout", {
      state: {
        directItem: {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock,
          quantity,
        },
      },
    });
  }

  return (
    <div className="detail">
      {/* ───── 왼쪽 : 이미지 영역 ───── */}
      <div className="detail-left">
        <div className="detail-main-image box">
          <img src={mainImage} alt={`${product.name} 이미지 ${imageIndex + 1}`} />
        </div>

        {/* 썸네일 버튼 : 눌린 순서(i)를 imageIndex 에 저장하면 위의 대표 이미지가 바뀐다 */}
        {images.length > 1 && (
          <div className="detail-thumbs" role="group" aria-label="상품 이미지 선택">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={i === imageIndex ? "detail-thumb active" : "detail-thumb"}
                aria-label={`이미지 ${i + 1} 보기`}
                aria-pressed={i === imageIndex}
                onClick={() => setImageIndex(i)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}

        {/* 상세 보기 버튼 : 누를 때마다 상세 이미지를 펼치고 접는다 */}
        <button
          type="button"
          className={detailOpen ? "detail-more-btn open" : "detail-more-btn"}
          aria-expanded={detailOpen}
          aria-controls="detail-more-content"
          onClick={() => setDetailOpen(!detailOpen)}
        >
          상세 보기 <span className="detail-more-arrow" aria-hidden="true">▼</span>
        </button>

        {/* 펼쳤을 때만 상세 이미지를 세로로 이어 붙여 보여 준다 */}
        {detailOpen && (
          <section id="detail-more-content" className="detail-more">
            {detailImages.length > 0 ? (
              detailImages.map((src, i) => (
                <img
                  key={src}
                  className="detail-more-image"
                  src={src}
                  alt={`${product.name} 상세 이미지 ${i + 1}`}
                />
              ))
            ) : (
              <p className="detail-more-empty">등록된 상세 이미지가 없습니다.</p>
            )}
          </section>
        )}
      </div>

      {/* ───── 오른쪽 : 구매 영역 ───── */}
      <div className="detail-right">
        <div className="box detail-name">{product.name}</div>

        <div className="box">가격 · 평점</div>

        <div className="box">옵션 선택 (색상 / 사이즈 / 수량)</div>

        {/* 수량 줄 : [−] [입력] [+]            금액 */}
        <div className="box detail-qty-row">
          <div className="qty-control">
            <button
              type="button"
              className="qty-btn"
              onClick={handleMinus}
              disabled={soldOut || quantity <= 1}
            >
              −
            </button>

            <input
              className="qty-input"
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={handleInput}
              disabled={soldOut}
            />

            <button
              type="button"
              className="qty-btn"
              onClick={handlePlus}
              disabled={soldOut || quantity >= product.stock}
            >
              +
            </button>
          </div>

          <span className="item-amount">{itemAmount.toLocaleString()}원</span>
        </div>

        {/* 총 구매액 줄 */}
        <div className="box detail-total">
          총 구매액 : <strong>{totalAmount.toLocaleString()}원</strong>
        </div>

        {/* 버튼 줄 : 오른쪽 영역의 맨 아래에 세로로 배치 (장바구니 / 구매하기) */}
        <div className="detail-buttons">
          <button
            type="button"
            className="btn"
            onClick={handleAddToCart}
            disabled={soldOut}
          >
            장바구니
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleBuyNow}
            disabled={soldOut}
          >
            구매하기
          </button>
        </div>
      </div>

      {/* 담았습니다 : [계속 쇼핑] [장바구니로]
          계속 쇼핑 / ✕ / ESC / 바깥 클릭 → 닫기만 한다 (상세 화면에 머문다) */}
      <Dialog
        open={dialog === "added"}
        center
        showClose
        icon={<CartPlusIcon />}
        title="장바구니에 상품을 담았습니다."
        cancelText="계속 쇼핑"
        confirmText="장바구니로"
        onCancel={() => setDialog(null)}
        onConfirm={handleGoCart}
      />

      {/* 재고 부족 안내 : 취소 버튼이 없는 알림 대화상자 */}
      <Dialog
        open={dialog === "stock"}
        title="재고가 부족합니다"
        onConfirm={() => setDialog(null)}
      >
        재고는 {product.stock}개이고, 장바구니에 이미 {inCart}개가 담겨 있습니다.
        <br />
        <span className="dialog-sub">
          {product.stock - inCart > 0
            ? `${product.stock - inCart}개까지 더 담을 수 있습니다.`
            : "더 담을 수 없습니다."}
        </span>
      </Dialog>
    </div>
  );
}

export default ProductDetail;
