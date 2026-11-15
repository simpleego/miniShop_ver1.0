// 백엔드 회원 배송지 API : GET /addresses (로그인 필요)
//   배송지는 주문할 때 자동으로 저장된다. 한 회원이 여러 개를 가질 수 있고 is_default 가 기본 배송지다.
import { apiFetch } from './auth'

export function fetchAddresses() {
    return apiFetch('/addresses', { auth: true })
}
