// 백엔드 상품 API : 상세 (/products/{id}), 검색 (/search/...)

const API_BASE = '/products'

// 공통함수
// fetch 요청
async function request(url, signal) {
    const res = await fetch(url, { signal })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `서버 오류 (${res.status})`)
    }

    return res.json()
}

// 상품 상세 : GET /products/{id}
export function fetchProductDetail(id, signal) {
    return request(`${API_BASE}/${id}`, signal)
}
// [검색] 카테고리 목록 : GET /search/categories
export function fetchCategories(signal) {
    return request('/search/categories', signal)
}

// [검색] 정렬 옵션 목록 : GET /search/sort-options
export function fetchSortOptions(signal) {
    return request('/search/sort-options', signal)
}

// [검색] 상품 검색 : GET /search/products?category_id=&keyword=&sub_keyword=&sort=&page=&size=
//   값이 없는 항목은 주소에서 뺀다.
export function searchProducts(params, signal) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    return request(`/search/products?${qs}`, signal)
}
