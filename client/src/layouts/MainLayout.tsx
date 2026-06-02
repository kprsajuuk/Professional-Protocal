import { Button, Layout, Menu, Space, Typography, theme as antdTheme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { APP_NAME, ROUTES } from "../constants";

const { Header, Sider, Content } = Layout;

// 主框架布局：侧栏导航 + 顶栏（主题切换/用户/登出）+ 内容区。
export function MainLayout() {
  const { user, logout } = useAuth();
  const { mode, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = antdTheme.useToken();

  const menuItems = [{ key: ROUTES.dashboard, label: "仪表盘" }];

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider breakpoint="lg" collapsible>
        <div
          style={{
            height: 48,
            margin: 16,
            color: "#fff",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {APP_NAME}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            paddingInline: 16,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space>
            <Button onClick={toggle}>{mode === "dark" ? "浅色" : "深色"}</Button>
            <Typography.Text>{user?.username ?? ""}</Typography.Text>
            <Button
              onClick={() => {
                logout();
                navigate(ROUTES.login, { replace: true });
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 16, overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
