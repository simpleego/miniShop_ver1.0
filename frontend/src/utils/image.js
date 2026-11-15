// 상품 이미지 경로를 정한다.
//   DB 의 image_url("/products/images/cola.jpg") 은 백엔드(backend/products/images 폴더)가 직접 내려주는 주소이다.
//   image_url 이 NULL 이면 상품명/id 로 만든 임시 이미지(캔 모양 SVG)를 보여준다.

// 임시 이미지에 쓸 색상 (상품 id 로 하나를 고른다)
const COLORS = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#ad1457', '#4e342e']

// SVG 글자에 넣을 수 없는 문자를 막는다
function escapeXml(text) {
  return String(text).replace(/[<>&"']/g, '')
}

// 상품명으로 임시 이미지(data URI)를 만든다
function makePlaceholder(id, name) {
  const color = COLORS[Math.abs(Number(id) || 0) % COLORS.length]
  const label = escapeXml(name || '').slice(0, 4)   // 캔 위에는 앞 4글자만
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="#f5f5f5"/>` +
    `<rect x="62" y="38" width="76" height="126" rx="12" fill="${color}"/>` +
    `<rect x="68" y="30" width="64" height="12" rx="4" fill="#b0bec5"/>` +
    `<rect x="62" y="150" width="76" height="14" rx="6" fill="#000" fill-opacity="0.25"/>` +
    `<text x="100" y="106" font-family="sans-serif" font-size="18" font-weight="bold" ` +
    `text-anchor="middle" fill="#fff">${label}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// product : { id, name, image_url }
//   DB 의 image_url("/products/images/cola.jpg") 은 백엔드가 그대로 내려주는 주소이므로
//   (Vite 프록시가 /products 를 백엔드로 전달한다) 경로를 바꾸지 않고 그대로 쓴다.
//   image_url 이 없으면 임시 이미지를 만든다.
export function toImagePath(imageUrl, id, name) {
  if (!imageUrl) return makePlaceholder(id, name)
  return imageUrl
}
