// 다음(카카오) 우편번호 서비스 : 주소 검색 팝업 (API 키 없이 쓸 수 있다)
//   https://postcode.map.daum.net/guide
//   스크립트는 처음 주소 검색을 누를 때 한 번만 불러온다.

const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
let loading = null

function loadScript() {
    if (window.daum?.Postcode) return Promise.resolve()
    if (!loading) {
        loading = new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = SCRIPT_URL
            script.async = true
            script.onload = resolve
            script.onerror = () => {
                loading = null     // 실패하면 다음 클릭에서 다시 시도한다
                reject(new Error('주소 검색 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'))
            }
            document.head.appendChild(script)
        })
    }
    return loading
}

// 주소 검색 팝업을 열고, 사용자가 주소를 고르면 { zipcode, address } 를 넘겨 준다
//   zipcode : 우편번호 (5자리)
//   address : 도로명주소 (사용자가 지번을 골랐으면 지번주소) + 참고항목(동, 건물명)
export async function openPostcode(onComplete) {
    await loadScript()
    new window.daum.Postcode({
        oncomplete(data) {
            const isRoad = data.userSelectedType === 'R'
            let address = isRoad ? data.roadAddress : data.jibunAddress

            if (isRoad) {
                // 도로명주소 뒤에 붙이는 참고항목 : (법정동, 공동주택 이름)
                const extra = []
                if (data.bname && /[동로가]$/.test(data.bname)) extra.push(data.bname)
                if (data.buildingName && data.apartment === 'Y') extra.push(data.buildingName)
                if (extra.length > 0) address += ` (${extra.join(', ')})`
            }
            onComplete({ zipcode: data.zonecode, address })
        },
    }).open()
}
