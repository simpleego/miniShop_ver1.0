import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../../context/authContext";
import "./Admin.css";

// 관리자 화면 공통 : 관리자만 들어올 수 있고, 위쪽에 "상품 관리 / 주문 관리" 탭을 보여 준다.
//   (화면에서 막는 것은 편의일 뿐이고, 실제 권한 확인은 서버(/admin, 403)가 한다)
function AdminLayout() {
  const { user, ready } = useAuthContext();
  const location = useLocation();

  if (!ready) return <p className="admin-message">확인하는 중...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "ADMIN") return <p className="admin-message error">관리자만 접근할 수 있습니다.</p>;

  return (
    <div className="admin-page">
      <h2 className="admin-title">관리자</h2>
      <nav className="admin-tabs">
        <NavLink to="/manage/products">상품 관리</NavLink>
        <NavLink to="/manage/orders">주문 관리</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export default AdminLayout;
