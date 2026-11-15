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
    },
  },
})
