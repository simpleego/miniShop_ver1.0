import { Link } from 'react-router-dom'
import './Header.css'

// 머리글 : 로고(홈 링크) + 장바구니 (담은 상품 수 배지)
// props: cartCount (장바구니에 담은 상품 수)
function Header({ cartCount }) {
  return (
    <header className="site-header">
      <div className="header-top">
        {/* a 태그는 페이지를 통째로 새로 불러오지만, Link 는 화면만 바꿔서 빠르다 */}
        <Link to="/" className="logo">🥤 음료 쇼핑몰</Link>

        <div className="header-actions" style={{ marginLeft: 'auto' }}>
          <Link to="/cart" className="cart-link" aria-label="장바구니">
            🛒
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
