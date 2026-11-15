import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/authContext";
import "./Auth.css";

// 로그인 화면
//   결제처럼 로그인이 필요한 화면에서 넘어왔으면 (state.from) 로그인 뒤에 그 화면으로 되돌아간다.
function LoginPage() {
  const { user, login } = useAuthContext();
  const location = useLocation();
  const from = location.state?.from ?? "/";
  const fromState = location.state?.fromState;

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 상태라면 로그인 화면이 필요 없다 (로그인 직후에도 여기서 이동한다)
  if (user) return <Navigate to={from} state={fromState} replace />;

  async function handleSubmit(e) {
    e.preventDefault();        // 폼 제출 때 페이지가 새로고침되는 것을 막는다
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // 로그인에 성공하면 user 가 생겨서, 위의 <Navigate> 가 이동을 처리한다
    } catch (err) {
      setError(err.message);   // 예 : "이메일 또는 비밀번호가 올바르지 않습니다."
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">로그인</h2>

      {location.state?.signedUp && <p className="auth-notice">가입이 완료되었습니다. 로그인해 주세요.</p>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="auth-field">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-btn wide" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="auth-foot">
        아직 회원이 아니신가요? <Link to="/signup" state={{ from, fromState }}>회원가입</Link>
      </p>
    </div>
  );
}

export default LoginPage;
