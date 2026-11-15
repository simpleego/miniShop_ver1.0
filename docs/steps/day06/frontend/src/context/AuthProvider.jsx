import { useEffect, useState } from "react";
import { AuthContext } from "./authContext";
import { fetchMe, getToken, loginRequest, setToken } from "../api/auth";

// 앱 바깥쪽에서 한 번만 감싸 주면, 안쪽 모든 화면이 같은 로그인 상태를 공유한다
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !getToken());   // 저장된 토큰이 없으면 확인할 것이 없다

  // 새로고침해도 로그인이 유지되도록, 저장된 토큰으로 내 정보를 다시 가져온다
  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then(setUser)
      .catch(() => setToken(null))        // 만료되었거나 잘못된 토큰은 버린다
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
