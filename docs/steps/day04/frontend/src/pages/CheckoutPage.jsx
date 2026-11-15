import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCartContext } from "../context/cartContext";
import { createOrder } from "../api/orders";
import { won } from "../utils/pricing";
import "./CheckoutPage.css";

// 주문결제 화면 (4일차 간단 버전)
//   이 화면으로 들어오는 길은 두 가지이고, 둘 다 navigate 의 state 로 정보를 받는다.
//     ① 장바구니의 구매하기   : state.ids        → 선택한 상품의 id 목록 (장바구니에서 찾는다)
//     ② 상품 상세의 구매하기  : state.directItem → 그 상품 1개와 수량 (장바구니와 무관)
function CheckoutPage() {
  const { cart, removeItems } = useCartContext();
  const navigate = useNavigate();
  const location = useLocation();
  const ids = location.state?.ids;
  const directItem = location.state?.directItem;

  const [paying, setPaying] = useState(false);   // 결제 처리 중 (버튼 중복 클릭 방지)
  const [error, setError] = useState("");        // 결제 실패 메시지
  const [paid, setPaid] = useState(false);       // 결제 성공 후 장바구니가 비어도 /cart 로 튕기지 않게 한다

  // 주문할 상품 목록
  let items = [];
  if (directItem) items = [directItem];
  else if (ids) items = cart.filter((item) => ids.includes(item.id));

  // 주소를 직접 입력해서 들어왔거나(선택 정보 없음) 상품이 모두 사라졌으면 장바구니로 돌려보낸다
  if (items.length === 0) {
    return paid ? null : <Navigate to="/cart" replace />;
  }

  // 화면에 보여 줄 합계 (※ 실제 결제 금액은 서버가 DB 가격으로 다시 계산한다)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 결제하기 : 서버에는 "어떤 상품을 몇 개" 만 보낸다 (가격은 보내지 않는다)
  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      const order = await createOrder(items.map((i) => ({ product_id: i.id, quantity: i.quantity })));
      setPaid(true);
      // 장바구니에서 온 구매면, 구매한 상품을 장바구니에서 뺀다
      if (!directItem) removeItems(items.map((i) => i.id));
      // replace : 뒤로 가기로 결제 화면에 다시 오지 못하게 기록을 바꿔치기한다
      navigate("/order-complete", { replace: true, state: { order } });
    } catch (e) {
      setError(e.message);     // 예 : "재고가 부족합니다. (콜라)"
      setPaying(false);
    }
  }

  return (
    <div className="checkout-page">
      <h2 className="checkout-title">주문 / 결제</h2>

      <ul className="checkout-list">
        {items.map((item) => (
          <li key={item.id}>
            <img src={item.image_url} alt={item.name} />
            <span className="checkout-name">{item.name} × {item.quantity}개</span>
            <strong>{won(item.price * item.quantity)}</strong>
          </li>
        ))}
      </ul>

      <div className="checkout-total">
        <span>결제 금액</span>
        <strong>{won(total)}</strong>
      </div>

      {error && <p className="checkout-error">⚠️ {error}</p>}

      <button type="button" className="checkout-pay" disabled={paying} onClick={handlePay}>
        {paying ? "결제 처리 중..." : `${won(total)} 결제하기`}
      </button>
    </div>
  );
}

export default CheckoutPage;
