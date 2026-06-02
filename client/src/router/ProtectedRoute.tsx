import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../constants";

// 受保护路由壳：未登录则跳转到登录页（携带回跳地址）。
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.login}?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
