// 백엔드 상품 API 를 부르는 함수 모음
//   화면(컴포넌트)은 fetch 를 직접 쓰지 않고 이 파일의 함수만 부른다.

// 공통 요청 함수 : 실패하면 서버가 준 메시지로 Error 를 던진다
//   signal : 요청을 도중에 취소할 때 쓰는 신호 (화면을 떠날 때 진행 중인 요청을 끊는다)
async function request(url, signal) {
    const res = await fetch(url, { signal })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `서버 오류 (${res.status})`)
    }

    return res.json()
}

// 상품 목록 : GET /products
export function fetchProducts(signal) {
    return request('/products', signal)
}

// 상품 상세 : GET /products/{id}
export function fetchProductDetail(id, signal) {
    return request(`/products/${id}`, signal)
}
