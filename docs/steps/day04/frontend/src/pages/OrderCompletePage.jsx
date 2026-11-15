import { Link, Navigate, useLocation } from "react-router-dom";
import { won } from "../utils/pricing";
import "./OrderCompletePage.css";

// 주문완료(구매 완료) 화면
//   결제하기 성공 후 navigate 의 state.order 로 서버 응답을 받아서 보여 준다.
//   주소를 직접 입력해서 들어오면(state 없음) 홈으로 돌려보낸다.
function OrderCompletePage() {
  const order = useLocation().state?.order;
  if (!order) return <Navigate to="/" replace />;

  return (
    <div className="complete-page">
      <h2 className="complete-title">✅ 결제가 완료되었습니다</h2>
      <p className="complete-sub">주문번호 {order.order_id} · 구매가 확정되었습니다.</p>

      <ul className="complete-list">
        {order.items.map((item) => (
          <li key={item.product_id}>
            <span>{item.product_name} × {item.quantity}개</span>
            <strong>{won(item.unit_price * item.quantity)}</strong>
          </li>
        ))}
      </ul>

      <div className="complete-total">
        <span>결제 금액 (상품 합계)</span>
        <strong>{won(order.total_price)}</strong>
      </div>

      <Link to="/" className="complete-home">쇼핑 계속하기</Link>
    </div>
  );
}

export default OrderCompletePage;
