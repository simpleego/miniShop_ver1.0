import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/authContext";
import Dialog from "../components/Dialog";
import "./Auth.css";

// 이메일 저장 : 체크하면 다음 로그인 때 이메일을 미리 채워 준다 (비밀번호는 저장하지 않는다)
const SAVED_EMAIL_KEY = "vm-saved-email";

function loadSavedEmail() {
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveEmail(email) {
  try {
    if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
    else localStorage.removeItem(SAVED_EMAIL_KEY);
  } catch {
    // 저장이 막혀 있어도 로그인은 계속된다
  }
}

// 간편 로그인 버튼 (회원관리 2차 단계에서 구현 예정 : 지금은 화면만 있다)
const SOCIALS = [
  { key: "kakao", label: "카카오", mark: "💬" },
  { key: "naver", label: "네이버", mark: "N" },
  { key: "google", label: "구글", mark: "G" },
];

// 로그인 화면
//   결제처럼 로그인이 필요한 화면에서 넘어왔으면 (state.from) 로그인 뒤에 그 화면으로 되돌아간다.
//   fromState 는 그 화면이 쓰던 정보(예: 결제할 상품 id)라서 그대로 다시 넘겨 준다.
function LoginPage() {
  const { user, login } = useAuthContext();
  const location = useLocation();
  const from = location.state?.from ?? "/";
  const fromState = location.state?.fromState;

  const savedEmail = loadSavedEmail();
  const [email, setEmail] = useState(location.state?.email ?? savedEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(savedEmail !== "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [soon, setSoon] = useState("");      // "준비 중" 안내 대화상자에 보여 줄 기능 이름

  // 이미 로그인한 상태로 들어왔다면 로그인 화면이 필요 없다 (로그인 직후에도 여기서 이동한다)
  if (user) return <Navigate to={from} state={fromState} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      saveEmail(remember ? email.trim().toLowerCase() : "");
      // 이동은 위의 <Navigate> 가 처리한다
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-page login-page">
      <Link to="/" className="login-logo">🥤 음료 쇼핑몰</Link>

      {location.state?.signedUp && <p className="auth-notice">가입이 완료되었습니다. 로그인해 주세요.</p>}
      {location.state?.passwordChanged && <p className="auth-notice">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.</p>}
      {location.state?.from === "/checkout" && !location.state?.signedUp && !location.state?.passwordChanged && (
        <p className="auth-hint" style={{ margin: "0 0 14px" }}>결제하려면 로그인이 필요합니다.</p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* 이메일과 비밀번호를 한 상자로 묶는다 */}
        <div className="login-box">
          <label className="login-field">
            <span className="login-icon" aria-hidden="true">👤</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              aria-label="이메일"
              autoComplete="email"
              required
            />
          </label>
          <label className="login-field">
            <span className="login-icon" aria-hidden="true">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              aria-label="비밀번호"
              autoComplete="current-password"
              required
            />
            <button type="button" className="login-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            </button>
          </label>
        </div>

        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          이메일 저장
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-btn wide" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <nav className="login-links" aria-label="계정 도움말">
        <Link to="/password-reset" state={{ from, fromState, email }}>비밀번호 재설정</Link>
        <span aria-hidden="true">|</span>
        <Link to="/signup" state={{ from, fromState }}>회원가입</Link>
      </nav>

      {/* 간편 로그인 : 화면만 구성했다 (구현 예정) */}
      <div className="login-divider" />
      <p className="login-social-title">간편 로그인</p>
      <div className="login-socials">
        {SOCIALS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`social-btn ${s.key}`}
            aria-label={`${s.label}로 로그인`}
            onClick={() => setSoon(`${s.label} 로그인`)}
          >
            {s.mark}
          </button>
        ))}
      </div>

      <Dialog open={soon !== ""} title="준비 중입니다" onConfirm={() => setSoon("")}>
        {soon} 기능은 아직 사용할 수 없습니다.
      </Dialog>
    </div>
  );
}

export default LoginPage;
