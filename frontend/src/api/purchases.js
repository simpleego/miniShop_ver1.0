// 백엔드 구매내역 API (로그인 필요)
//   구매내역 = 결제 완료(PAID) 만. 환불된 주문, 결제 전 주문은 나오지 않는다.
import { apiFetch } from './auth'

// 구매내역 목록 : GET /purchases?period=1y&page=1&size=10
//   period : 1m(1개월) / 3m / 6m / 1y(1년), 결제 시각(paid_at) 기준
//   돌려주는 값 : [{ order_id, total_price, paid_at, first_product_name, item_count }]
export function fetchPurchases(period, page, size) {
    return apiFetch(`/purchases?period=${period}&page=${page}&size=${size}`, { auth: true })
}

// 주문(구매) 상세 : GET /orders/{id}  → 상품 목록 + 배송지
export function fetchOrderDetail(orderId) {
    return apiFetch(`/orders/${orderId}`, { auth: true })
}
