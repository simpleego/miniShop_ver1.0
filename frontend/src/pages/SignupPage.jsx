import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendEmailCode, signup, verifyEmailCode } from "../api/auth";
import "./Auth.css";

// 회원가입 화면 (이메일, 비밀번호, 이름)
//   ① 이메일 입력 → [인증코드 받기] : 6자리 코드가 이메일로 온다 (개발 모드에서는 서버 콘솔에 출력된다)
//   ② 코드 입력 → [확인]            : 인증되면 이메일이 잠기고 아래 입력칸이 열린다
//   ③ 비밀번호, 이름 → [가입하기]   : 가입 후 로그인 화면으로 이동한다
function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);        // 코드 재발송까지 남은 초
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 재발송 대기 시간을 1초마다 줄인다
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 서버 요청 공통 처리 : 중복 클릭 방지 + 오류 메시지 표시
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
      const data = await sendEmailCode(email);
      setCodeSent(true);
      setCode("");
      setCooldown(data.resend_after);
    });

  const handleVerify = () =>
    run(async () => {
      await verifyEmailCode(email, code);
      setVerified(true);
    });

  function handleSubmit(e) {
    e.preventDefault();
    if (password !== password2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    run(async () => {
      await signup(email, password, name);
      // 결제 화면에서 왔다면 로그인 뒤에 돌아갈 곳을 이어서 넘긴다
      navigate("/login", { replace: true, state: { ...location.state, signedUp: true, email: email.trim().toLowerCase() } });
    });
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">회원가입</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* ① 이메일 */}
        <label className="auth-field">
          이메일
          <span className="auth-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={verified}
              autoComplete="email"
              required
            />
            {!verified && (
              <button type="button" className="auth-btn sub" onClick={handleSend} disabled={busy || cooldown > 0 || !email}>
                {codeSent ? (cooldown > 0 ? `재발송 (${cooldown})` : "재발송") : "인증코드 받기"}
              </button>
            )}
          </span>
        </label>

        {/* ② 인증 코드 */}
        {codeSent && !verified && (
          <>
            <label className="auth-field">
              인증코드 6자리
              <span className="auth-row">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                />
                <button type="button" className="auth-btn" onClick={handleVerify} disabled={busy || code.length !== 6}>
                  확인
                </button>
              </span>
            </label>
            <p className="auth-hint">이메일로 보낸 코드를 5분 안에 입력해 주세요.</p>
          </>
        )}
        {verified && <p className="auth-ok">✓ 이메일 인증이 완료되었습니다.</p>}

        {/* ③ 비밀번호 / 이름 : 이메일 인증 뒤에 열린다 */}
        {verified && (
          <>
            <label className="auth-field">
              비밀번호
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
              비밀번호 확인
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="auth-field">
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoComplete="name" required />
            </label>

            <button type="submit" className="auth-btn wide" disabled={busy}>
              {busy ? "가입 중..." : "가입하기"}
            </button>
          </>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
      </form>

      <p className="auth-foot">
        이미 회원이신가요? <Link to="/login" state={location.state}>로그인</Link>
      </p>
    </div>
  );
}

export default SignupPage;
