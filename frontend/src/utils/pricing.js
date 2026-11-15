// 금액 규칙 모음 (장바구니, 주문결제 화면이 같은 값을 쓰도록 한 곳에 둔다)
//   ※ 쿠폰, 적립은 회원 기능이 없어 가상으로만 계산한다. 정책이 정해지면 이 값들을 바꾸면 된다.

export const SHIPPING_FEE = 0;          // 배송비 (0원 = 무료배송)
export const COUPON_RATE = 0.1;         // 가상 쿠폰 : 상품금액의 10% 할인
export const POINT_RATE = 0.01;         // 가상 기본 적립률 : 결제금액의 1%
export const GRADE_POINT_RATE = 0.005;  // 가상 회원 등급 추가 적립률 : 결제금액의 0.5%

// 12345 → "12,345원"
export const won = (n) => `${n.toLocaleString()}원`;
