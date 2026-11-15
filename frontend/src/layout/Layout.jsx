import Header from './Header'
import Footer from './Footer'

// children: 레이아웃 안에 끼워 넣을 본문
function Layout({ children, ...headerProps }) {
  return (
    <div className="layout">
      <Header {...headerProps} />
      <main className="content">{children}</main>
      <Footer />
    </div>
  )
}

export default Layout
