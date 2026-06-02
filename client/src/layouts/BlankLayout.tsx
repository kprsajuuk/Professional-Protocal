import { Layout } from "antd";
import { Outlet } from "react-router-dom";

// 无框架布局：登录等独立页面使用。
export function BlankLayout() {
  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Outlet />
    </Layout>
  );
}
