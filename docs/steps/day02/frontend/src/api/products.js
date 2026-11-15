// 백엔드 상품 API 를 부르는 함수 모음
//   화면(컴포넌트)은 fetch 를 직접 쓰지 않고 이 파일의 함수만 부른다.
//   → 서버 주소가 바뀌어도 이 파일만 고치면 된다.

// 공통 요청 함수 : 실패하면 서버가 준 메시지로 Error 를 던진다
async function request(url) {
    const res = await fetch(url)

    if (!res.ok) {
        // 서버 오류 응답은 {"detail": "메시지"} 모양이다
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `서버 오류 (${res.status})`)
    }

    return res.json()
}

// 상품 목록 : GET /products
export function fetchProducts() {
    return request('/products')
}
