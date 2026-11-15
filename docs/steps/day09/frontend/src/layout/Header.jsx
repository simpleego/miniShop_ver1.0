import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './Header.css'
import CategoryNav from './CategoryNav'
import { useAuthContext } from '../context/authContext'

// cartCount: 장바구니 개수
function Header({ cartCount }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '')
  const { user, logout } = useAuthContext()   // 로그인한 회원 (없으면 null)

  const handleSubmit = (e) => {
    e.preventDefault()              // 폼 제출 시 페이지 새로고침 방지
    // 검색하면 현재 카테고리는 유지하고, 정렬/2차 검색어/페이지는 초기화한다
    const qs = new URLSearchParams()
    const categoryId = params.get('category_id')
    if (categoryId) qs.set('category_id', categoryId)
    if (keyword.trim()) qs.set('keyword', keyword.trim())
    navigate(qs.toString() ? `/?${qs}` : '/')
  }

  return (
    <header className="site-header">
      <div className="header-top">
        {/* a 태그는 페이지를 통째로 새로 불러오지만, Link 는 화면만 바꿔서 빠르다 */}
        <Link to="/" className="logo">🥤 음료 쇼핑몰</Link>

        <form className="search" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="음료 검색"
          />
          <button type="submit" aria-label="검색">🔍</button>
        </form>

        <div className="header-actions">
          {user ? (
            <>
              <span className="user-name">{user.name}님</span>
              {user.role === 'ADMIN' && <Link to="/manage">관리자</Link>}
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

      <CategoryNav />
    </header>
  )
}

export default Header
