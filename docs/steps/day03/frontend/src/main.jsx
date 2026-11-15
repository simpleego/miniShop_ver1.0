import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import CartProvider from './context/CartProvider.jsx'
import App from './App.jsx'

// BrowserRouter : 주소(URL)에 따라 화면을 바꾸는 기능을 앱 전체에 제공한다
// CartProvider  : 장바구니를 앱 전체(헤더, 상세, 장바구니 화면)가 함께 쓰게 한다
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
)
