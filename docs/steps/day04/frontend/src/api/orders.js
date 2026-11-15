// 백엔드 주문 API : POST /orders

// 구매하기 (주문 + 결제를 한 번에 처리한다)
//   items : [{ product_id, quantity }]   ※ 가격은 보내지 않는다. 서버가 DB 에서 읽는다.
//   성공  : { order_id, status: "PAID", total_price, items: [...] }
//   실패  : 서버가 준 메시지(재고 부족 등)로 Error 를 던진다.
export async function createOrder(items) {
    const res = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },   // 보내는 데이터가 JSON 이라고 알려 준다
        body: JSON.stringify({ items }),                   // 객체 → JSON 글자
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // 422 (입력 형식 오류) 는 detail 이 배열로 올 수 있어 일반 문구로 바꾼다
        throw new Error(typeof data.detail === 'string' ? data.detail : '입력한 내용을 확인해 주세요.')
    }
    return res.json()
}
