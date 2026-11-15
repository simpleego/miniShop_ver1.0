// 백엔드 주문 / 구매 API : POST /orders  (로그인 필요)
import { apiFetch } from './auth'

// 구매하기 (주문 + 결제를 한 번에 처리한다)
//   items    : [{ product_id, quantity }]   ※ 가격은 보내지 않는다. 서버가 DB 에서 읽는다.
//   shipping : { receiver_name, receiver_phone, address, request_memo }  배송지 (주문에 저장된다)
//   성공 : { order_id, status: "PAID", total_price, items: [...] }
//   실패 : 서버가 준 메시지(재고 부족 등)로 Error 를 던진다. 로그인이 풀렸으면 error.status === 401
export function createOrder(items, shipping) {
    return apiFetch('/orders', { method: 'POST', body: { items, shipping }, auth: true })
}
