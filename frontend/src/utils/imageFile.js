// 이미지 업로드 파일 검사 (화면에서 먼저 거른다. 서버도 같은 검사를 해야 한다)
//   SVG 는 안에 스크립트를 넣을 수 있어 허용하지 않는다.
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_MB = 2
export const ACCEPT = ALLOWED_TYPES.join(',')

// 문제가 없으면 '' 를, 있으면 사용자에게 보여 줄 문구를 돌려준다
export function validateImageFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) return 'JPG, PNG, WEBP 이미지만 올릴 수 있습니다.'
    if (file.size > MAX_MB * 1024 * 1024) return `파일 크기는 ${MAX_MB}MB 이하여야 합니다. (${(file.size / 1024 / 1024).toFixed(1)}MB)`
    return ''
}

export const formatSize = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`

// 고른 파일의 미리보기 주소. 화면을 떠날 때 revokeAllPreviews() 로 한꺼번에 반납한다.
const previews = new Set()
export function createPreview(file) {
    const url = URL.createObjectURL(file)
    previews.add(url)
    return url
}
export function revokeAllPreviews() {
    previews.forEach((u) => URL.revokeObjectURL(u))
    previews.clear()
}

// 상세 이미지 최대 장수 (서버의 DETAIL_MAX 와 같게 둔다)
export const DETAIL_MAX = 10
// 목록에서 항목을 구별하는 임시 번호
let nextKey = 1
export const newDetailKey = () => nextKey++
