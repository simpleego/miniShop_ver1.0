import { CartContext } from "./cartContext";
import { useCart } from "../hooks/useCart";

// 앱 바깥쪽에서 한 번만 감싸 주면, 안쪽 모든 화면이 같은 장바구니를 공유한다
function CartProvider({ children }) {
  const cart = useCart();   // 장바구니 상태는 여기서 단 하나만 만든다

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export default CartProvider;
