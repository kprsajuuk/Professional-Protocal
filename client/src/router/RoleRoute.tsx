import { Navigate, Outlet } from "react-router-dom";
import { Result } from "antd";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../constants";

// 角色守卫：在 ProtectedRoute 之内使用。目前仅区分「是否管理员」。
export function RoleRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (requireAdmin && !isAdmin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="你没有访问该页面的权限（需要管理员）。"
      />
    );
  }

  return <Outlet />;
}
