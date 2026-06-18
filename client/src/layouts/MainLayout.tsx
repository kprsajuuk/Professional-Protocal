import {
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Tooltip,
  theme as antdTheme,
  type MenuProps,
} from "antd";
import {
  ApartmentOutlined,
  BulbOutlined,
  ContactsOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { ROUTES } from "../constants";

const { Header, Sider, Content } = Layout;

// 主框架布局：侧栏导航（可收起，仅显图标）+ 顶栏（主题切换 + 头像菜单）+ 内容区。
export function MainLayout() {
  const { user, isAdmin, logout } = useAuth();
  const { mode, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = antdTheme.useToken();

  const menuItems: MenuProps["items"] = [
    { key: ROUTES.dashboard, icon: <DashboardOutlined />, label: "仪表盘" },
    { key: ROUTES.relationships, icon: <ApartmentOutlined />, label: "我的关系" },
    { key: ROUTES.persons, icon: <ContactsOutlined />, label: "人物库" },
    ...(isAdmin
      ? [
          { key: ROUTES.users, icon: <TeamOutlined />, label: "用户管理" },
          { key: ROUTES.system, icon: <SettingOutlined />, label: "系统管理" },
        ]
      : []),
  ];

  // 详情页(如 /relationships/:id)仍高亮其所属主菜单。
  const selectedKey =
    [ROUTES.relationships, ROUTES.persons, ROUTES.users, ROUTES.system].find(
      (key) => location.pathname.startsWith(key),
    ) ?? ROUTES.dashboard;

  const avatarMenu: MenuProps["items"] = [
    { key: "profile", icon: <UserOutlined />, label: "个人信息" },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
  ];

  const onAvatarMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "profile") {
      navigate(ROUTES.profile);
    } else if (key === "logout") {
      logout();
      navigate(ROUTES.login, { replace: true });
    }
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider breakpoint="lg" collapsible>
        <div
          style={{
            height: 56,
            margin: 16,
            color: "#fff",
            fontWeight: 700,
            lineHeight: 1.15,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <span>Professional</span>
          <span>Protocal</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
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
          <Space size="middle">
            <Tooltip title={mode === "dark" ? "切换浅色" : "切换深色"}>
              <Button type="text" icon={<BulbOutlined />} onClick={toggle} />
            </Tooltip>
            <Dropdown
              menu={{ items: avatarMenu, onClick: onAvatarMenuClick }}
              placement="bottomRight"
              trigger={["hover"]}
            >
              <Avatar
                style={{ backgroundColor: token.colorPrimary, cursor: "pointer" }}
                icon={<UserOutlined />}
              >
                {(user?.displayName || user?.username || "")
                  .slice(0, 1)
                  .toUpperCase()}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 16, overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
