import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword, sendResetCode } from "../api/auth";
import "./Auth.css";

// 비밀번호 재설정 화면
//   ① 이메일 입력 → [인증코드 받기]  : 가입한 이메일이면 6자리 코드가 온다 (개발 모드에서는 서버 콘솔에 출력)
//      ※ 가입하지 않은 이메일이어도 같은 안내가 나온다 (가입 여부를 알려 주지 않기 위해)
//   ② 코드 + 새 비밀번호 입력 → [비밀번호 변경] : 성공하면 로그인 화면으로 이동한다
function PasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);        // 코드 재발송까지 남은 초
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function run(task) {
    setError("");
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleSend = () =>
    run(async () => {
      const data = await sendResetCode(email);
      setCodeSent(true);
      setCode("");
      setCooldown(data.resend_after);
    });

  function handleSubmit(e) {
    e.preventDefault();
    if (password !== password2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    run(async () => {
      await resetPassword(email, code, password);
      // 결제 화면에서 왔다면 로그인 뒤에 돌아갈 곳을 이어서 넘긴다
      navigate("/login", { replace: true, state: { ...location.state, passwordChanged: true, email: email.trim().toLowerCase() } });
    });
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">비밀번호 재설정</h2>
      <p className="auth-hint" style={{ margin: "-8px 0 16px" }}>
        가입한 이메일로 인증코드를 보내 드립니다.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          이메일
          <span className="auth-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <button type="button" className="auth-btn sub" onClick={handleSend} disabled={busy || cooldown > 0 || !email}>
              {codeSent ? (cooldown > 0 ? `재발송 (${cooldown})` : "재발송") : "인증코드 받기"}
            </button>
          </span>
        </label>

        {codeSent && (
          <>
            <p className="auth-ok">
              가입된 이메일이라면 인증코드를 보냈습니다. 5분 안에 입력해 주세요.
            </p>
            <label className="auth-field">
              인증코드 6자리
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
              />
            </label>
            <label className="auth-field">
              새 비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                required
              />
            </label>
            <p className="auth-hint">8자 이상, 영문과 숫자를 모두 포함해 주세요.</p>
            <label className="auth-field">
              새 비밀번호 확인
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <button type="submit" className="auth-btn wide" disabled={busy || code.length !== 6}>
              {busy ? "변경 중..." : "비밀번호 변경"}
            </button>
          </>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
      </form>

      <p className="auth-foot">
        <Link to="/login" state={location.state}>로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}

export default PasswordResetPage;
