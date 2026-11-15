import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // 개발 중 캐시 끄기 : 이미지, 화면 파일, API 응답을 브라우저가 저장해 두지 않고 매번 새로 받는다.
    //   (이미지 파일을 같은 이름으로 바꿔도 예전 그림이 남아 보이는 일을 막는다)
    //   개발 서버(npm run dev)에만 적용된다. 배포(npm run build)한 사이트의 캐시 설정과는 무관하다.
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      // 상품 검색 API (/search/...). 다른 서버로 보내려면 실행 시 API_TARGET 환경변수 지정
      '/search': process.env.API_TARGET || 'http://localhost:8000',
      // 상품 API (목록, 상세, 등록, 수정, 삭제) + 상품 이미지 (/products/images/...)
      '/products': 'http://localhost:8000',
      // 주문 / 구매 API (결제하기 → POST /orders, 구매내역 → GET /purchases)
      //   ※ 화면 주소는 /order-complete 로 만들어 이 프록시와 겹치지 않게 한다
      '/orders': 'http://localhost:8000',
      // 회원 API (이메일 인증, 가입, 로그인, 내 정보). 화면 주소는 /login, /signup 이라 겹치지 않는다
      '/auth': 'http://localhost:8000',
      // 회원 배송지 API (저장된 배송지 목록)
      '/addresses': 'http://localhost:8000',
      '/purchases': 'http://localhost:8000',
      // 관리자 API (상품 관리 목록, 주문 관리, 환불). 화면 주소는 /manage 라 겹치지 않는다
      '/admin': 'http://localhost:8000',
    },
  },
})