import { useEffect, useState } from "react";
import { clampQuantity } from "../utils/quantity";

// localStorage 에 장바구니를 저장하는 이름표(key)
const STORAGE_KEY = "vm-cart";

// 저장된 장바구니를 읽는다. 없거나 깨져 있으면 빈 배열
//   시크릿 모드 등에서 localStorage 접근이 실패해도 화면이 멈추지 않게 try / catch 로 감싼다
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// 장바구니 상태 + 담기 / 수량 변경 / 삭제 기능
//   cart 항목 모양 : { id, name, price, image_url, stock, quantity }
export function useCart() {
  // 처음 한 번만 localStorage 에서 읽어 온다 (함수를 넘기면 최초 렌더링 때만 실행된다)
  const [cart, setCart] = useState(loadCart);

  // cart 가 바뀔 때마다 localStorage 에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // 저장 공간이 부족하거나 막혀 있어도 화면은 계속 동작한다
    }
  }, [cart]);

  // 장바구니에 담긴 특정 상품의 수량 (없으면 0)
  function getQuantity(id) {
    return cart.find((item) => item.id === id)?.quantity ?? 0;
  }

  // 담기 : 이미 있는 상품이면 수량을 더하고, 없으면 새 항목을 추가한다
  function addToCart(product, quantity) {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);

      if (found) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                stock: product.stock, // 최신 재고로 갱신
                quantity: clampQuantity(item.quantity + quantity, product.stock),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock,
          quantity: clampQuantity(quantity, product.stock),
        },
      ];
    });
  }

  // 수량 변경 : 1 ~ 재고 사이로 보정한다
  function updateQuantity(id, quantity) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: clampQuantity(quantity, item.stock) }
          : item
      )
    );
  }

  // 한 상품 삭제
  function removeItem(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // 여러 상품 삭제 (장바구니 화면의 "선택삭제")
  function removeItems(ids) {
    setCart((prev) => prev.filter((item) => !ids.includes(item.id)));
  }

  // 전체 비우기
  function clearCart() {
    setCart([]);
  }

  // 계산값은 state 로 따로 만들지 않고 cart 에서 매번 계산한다
  // itemCount  : 담은 "상품 수" (콜라 5개 + 생수 1개 → 2)   → 헤더 🛒 배지
  // totalCount : 모든 "수량의 합" (콜라 5개 + 생수 1개 → 6) → 장바구니 화면의 총 수량
  const itemCount = cart.length;
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    cart,
    getQuantity,
    addToCart,
    updateQuantity,
    removeItem,
    removeItems,
    clearCart,
    itemCount,
    totalCount,
    totalPrice,
  };
}
