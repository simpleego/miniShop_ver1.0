import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <nav className="footer-links">
        <a href="#terms">이용약관</a>
        <a href="#privacy">개인정보처리방침</a>
        <a href="#help">고객센터</a>
      </nav>
      <p className="footer-copy">© {year} 음료 쇼핑몰. All rights reserved.</p>
    </footer>
  )
}

export default Footer
