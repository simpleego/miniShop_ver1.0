import { createContext, useContext } from "react";

// 장바구니를 앱 어디서나(헤더, 상세, 장바구니 화면) 꺼내 쓰기 위한 "공용 보관함"
export const CartContext = createContext(null);

// 사용하는 쪽에서는 이 함수만 부르면 된다 : const { cart, addToCart } = useCartContext()
export function useCartContext() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCartContext 는 <CartProvider> 안에서만 사용할 수 있습니다.");
  }
  return value;
}
