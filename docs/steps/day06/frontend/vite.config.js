import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 프록시 : 아래 주소로 시작하는 요청은 Vite 가 백엔드(8000)로 대신 전달한다.
    //   브라우저는 항상 5173 하고만 통신하므로 CORS 오류가 생기지 않는다.
    proxy: {
      // 상품 API (/products) + 상품 이미지 (/products/images/...)
      '/products': 'http://localhost:8000',
      // 주문 API (결제하기 → POST /orders)
      //   ※ 화면 주소는 /order-complete 로 만들어 이 프록시와 겹치지 않게 한다
      '/orders': 'http://localhost:8000',
      // 회원 API (이메일 인증, 가입, 로그인, 내 정보). 화면 주소는 /login, /signup 이라 겹치지 않는다
      '/auth': 'http://localhost:8000',
    },
  },
})
