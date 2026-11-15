import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { fetchCategories } from '../api/products'

// 카테고리 버튼 줄. 목록은 서버(/search/categories)에서 받고, 선택값은 주소(?category_id=)에 담는다.
function CategoryNav() {
  const [categories, setCategories] = useState([])
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const selected = params.get('category_id')

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {})          // 실패해도 "전체" 버튼은 보인다
    return () => controller.abort()
  }, [])

  // 카테고리를 바꾸면 검색어/정렬은 초기화하고 1페이지부터 보여 준다
  const select = (id) => navigate(id ? `/?category_id=${id}` : '/')

  return (
    <nav className="category-nav">
      <button
        className={!selected ? 'category-item active' : 'category-item'}
        onClick={() => select(null)}
      >
        전체
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={String(c.id) === selected ? 'category-item active' : 'category-item'}
          onClick={() => select(c.id)}
        >
          {c.name}
        </button>
      ))}
    </nav>
  )
}

export default CategoryNav
