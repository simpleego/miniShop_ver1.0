// 수량을 1 ~ 재고 사이로 맞춘다. 숫자가 아니면 1
//   상세 화면과 장바구니가 같은 규칙을 쓰도록 한 곳에 둔다.
export function clampQuantity(value, stock) {
  const n = Number.isNaN(value) ? 1 : value;
  return Math.min(Math.max(n, 1), stock);
}
