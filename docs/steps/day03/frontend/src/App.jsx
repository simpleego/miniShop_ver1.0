import { Routes, Route } from 'react-router-dom'
import Layout from './layout/Layout'
import ProductList from './pages/ProductList'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
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
          ※ 화면 주소를 /products/... 로 만들면 Vite 프록시가 백엔드로 보내 버리므로 단수형(product)을 쓴다 */}
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </Layout>
  )
}

export default App
