// 관리자 API (관리자 로그인 필요) : 상품 관리, 주문 관리
//   화면 주소는 /manage/..., API 주소는 /admin/... 이다. (/admin 은 Vite 프록시가 백엔드로 보내기 때문)
import { apiFetch } from './auth'

// 값이 있는 항목만 ?쿼리 로 만든다
function qs(params) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.set(k, v)
    })
    return q.toString()
}

// ---- 상품 관리 ----
// 목록 (판매중지 포함) : GET /admin/products?keyword=&status=all|active|inactive&page=&size=
export const adminListProducts = (params) => apiFetch(`/admin/products?${qs(params)}`, { auth: true })
// 수정 화면용 1개 : GET /admin/products/{id}
export const adminGetProduct = (id) => apiFetch(`/admin/products/${id}`, { auth: true })
// 등록 : POST /products
export const createProduct = (body) => apiFetch('/products', { method: 'POST', body, auth: true })
// 수정 : PUT /products/{id}
export const updateProduct = (id, body) => apiFetch(`/products/${id}`, { method: 'PUT', body, auth: true })
// 삭제(판매중지) : DELETE /products/{id}
export const deleteProduct = (id) => apiFetch(`/products/${id}`, { method: 'DELETE', auth: true })

// ---- 주문 관리 ----
// 목록 : GET /admin/orders?status=&keyword=&page=&size=
export const adminListOrders = (params) => apiFetch(`/admin/orders?${qs(params)}`, { auth: true })
// 상세 : GET /admin/orders/{id}
export const adminGetOrder = (id) => apiFetch(`/admin/orders/${id}`, { auth: true })
// 환불 : POST /admin/orders/{id}/refund
export const refundOrder = (id) => apiFetch(`/admin/orders/${id}/refund`, { method: 'POST', auth: true })
