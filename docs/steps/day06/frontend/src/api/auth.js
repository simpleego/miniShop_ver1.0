// 백엔드 회원 API : 이메일 인증, 회원가입, 로그인, 내 정보
//   로그인 토큰(JWT)은 localStorage 에 저장하고, 로그인이 필요한 요청의 Authorization 헤더에 실어 보낸다.

const TOKEN_KEY = 'vm-token'

export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

export function setToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token)
        else localStorage.removeItem(TOKEN_KEY)
    } catch {
        // 저장이 막혀 있어도 화면은 계속 동작한다 (새로고침하면 로그아웃된다)
    }
}

// 로그인이 필요한 요청에 붙이는 헤더 :  Authorization: Bearer 토큰
export function authHeaders() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// 공통 요청 : 실패하면 서버가 준 메시지로 Error 를 던진다 (error.status 에 상태코드)
//   auth: true 이면 로그인 토큰을 함께 보낸다
export async function apiFetch(url, { method = 'GET', body, auth = false } = {}) {
    const res = await fetch(url, {
        method,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(auth ? authHeaders() : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // 422 (입력 형식 오류) 는 detail 이 배열로 올 수 있어 일반 문구로 바꾼다
        const message = typeof data.detail === 'string' ? data.detail : '입력한 내용을 확인해 주세요.'
        const error = new Error(message)
        error.status = res.status
        throw error
    }
    return res.json()
}

export const sendEmailCode = (email) => apiFetch('/auth/email/send', { method: 'POST', body: { email } })
export const verifyEmailCode = (email, code) => apiFetch('/auth/email/verify', { method: 'POST', body: { email, code } })
export const signup = (email, password, name) => apiFetch('/auth/signup', { method: 'POST', body: { email, password, name } })
export const loginRequest = (email, password) => apiFetch('/auth/login', { method: 'POST', body: { email, password } })
export const fetchMe = () => apiFetch('/auth/me', { auth: true })
