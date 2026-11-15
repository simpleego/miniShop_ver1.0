import { Link } from 'react-router-dom'
import './Header.css'
import { useAuthContext } from '../context/authContext'

// 머리글 : 로고(홈 링크) + 로그인 / 회원 메뉴 + 장바구니 (담은 상품 수 배지)
// props: cartCount (장바구니에 담은 상품 수)
function Header({ cartCount }) {
  const { user, logout } = useAuthContext()   // 로그인한 회원 (없으면 null)

  return (
    <header className="site-header">
      <div className="header-top">
        <Link to="/" className="logo">🥤 음료 쇼핑몰</Link>

        <div className="header-actions" style={{ marginLeft: 'auto' }}>
          {user ? (
            <>
              <span className="user-name">{user.name}님</span>
              <Link to="/mypage/purchases">구매내역</Link>
              <button type="button" className="logout-btn" onClick={logout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link to="/signup">회원가입</Link>
            </>
          )}
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
