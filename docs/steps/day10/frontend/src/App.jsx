import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import ProductList from './pages/ProductList'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderCompletePage from './pages/OrderCompletePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PurchasesPage from './pages/PurchasesPage'
import PasswordResetPage from './pages/PasswordResetPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminProductFormPage from './pages/admin/AdminProductFormPage'
import { useCartContext } from './context/cartContext'

function App() {
  // 헤더 🛒 배지에 보여 줄 "담은 상품 수" (수량의 합이 아니다. 장바구니는 CartProvider 가 관리한다)
  const { itemCount } = useCartContext()

  return (
    <Layout cartCount={itemCount}>
      {/* 주소에 따라 본문이 바뀐다
          /             → 상품 목록
          /product/:id  → 상품 상세 (:id 는 상품 번호)
          /cart         → 장바구니
          /checkout     → 주문결제 (장바구니에서 선택한 상품)
          /order-complete → 결제 완료 (구매 확정)
          /login, /signup, /password-reset → 로그인, 회원가입 (이메일 인증), 비밀번호 재설정
          /mypage/purchases → 구매내역 (※ /purchases 는 프록시가 API 로 보내므로 화면 주소는 /mypage/... 로 한다)
          /manage/products(/new, /:id/edit), /manage/orders → 관리자 (상품 관리 / 등록 / 수정, 주문 관리). API 는 /admin 이라 화면 주소는 /manage 로 한다
          ※ /products/... 로 만들면 vite 프록시가 백엔드로 보내 버리므로 단수형(product)을 쓴다 */}
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-complete" element={<OrderCompletePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/mypage/purchases" element={<PurchasesPage />} />
        <Route path="/manage" element={<AdminLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
        </Route>
      </Routes>
    </Layout>
  )
}

export default App
