import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Spin } from "antd";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";
import { BlankLayout } from "../layouts/BlankLayout";

// 页面懒加载：按需切分代码。
const LoginPage = lazy(() => import("../pages/login/LoginPage"));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

function withSuspense(Component: ComponentType) {
  return (
    <Suspense fallback={<Spin style={{ display: "block", marginTop: 80 }} />}>
      <Component />
    </Suspense>
  );
}

// 路由表：受保护区域用 MainLayout 框架，登录页用 BlankLayout。
export const router = createBrowserRouter([
  {
    element: <BlankLayout />,
    children: [{ path: "/login", element: withSuspense(LoginPage) }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [{ index: true, element: withSuspense(DashboardPage) }],
      },
    ],
  },
  { path: "*", element: withSuspense(NotFoundPage) },
]);
