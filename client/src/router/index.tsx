import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Spin } from "antd";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { MainLayout } from "../layouts/MainLayout";
import { BlankLayout } from "../layouts/BlankLayout";
import { ROUTES } from "../constants";

// 页面懒加载：按需切分代码。
const LoginPage = lazy(() => import("../pages/login/LoginPage"));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const UsersPage = lazy(() => import("../pages/users/UsersPage"));
const ProfilePage = lazy(() => import("../pages/profile/ProfilePage"));
const PersonsPage = lazy(() => import("../pages/persons/PersonsPage"));
const RelationshipsPage = lazy(
  () => import("../pages/relationships/RelationshipsPage"),
);
const RelationshipDetailPage = lazy(
  () => import("../pages/relationships/RelationshipDetailPage"),
);
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
        children: [
          { index: true, element: withSuspense(DashboardPage) },
          { path: ROUTES.profile, element: withSuspense(ProfilePage) },
          { path: ROUTES.persons, element: withSuspense(PersonsPage) },
          {
            path: ROUTES.relationships,
            element: withSuspense(RelationshipsPage),
          },
          {
            path: `${ROUTES.relationships}/:id`,
            element: withSuspense(RelationshipDetailPage),
          },
          {
            element: <RoleRoute requireAdmin />,
            children: [
              { path: ROUTES.users, element: withSuspense(UsersPage) },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: withSuspense(NotFoundPage) },
]);
