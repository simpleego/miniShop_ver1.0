import { createContext, useContext } from "react";

// 로그인 상태를 앱 어디서나(헤더, 로그인, 결제 화면) 꺼내 쓰기 위한 "공용 보관함"
export const AuthContext = createContext(null);

// const { user, ready, login, logout } = useAuthContext()
//   user  : 로그인한 회원 { id, email, name, role } , 로그인 전이면 null
//   ready : 저장된 토큰으로 로그인 상태를 확인하는 중이면 false
export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthContext 는 <AuthProvider> 안에서만 사용할 수 있습니다.");
  }
  return value;
}
