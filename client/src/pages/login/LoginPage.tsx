import { useState } from "react";
import { Button, Card, Divider, Form, Input, Typography } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { APP_NAME, ROUTES } from "../../constants";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);

  // 已登录用户访问 /login：直接跳入应用（要换账号需先退出登录）。
  if (isAuthenticated) {
    const redirect = params.get("redirect");
    return (
      <Navigate
        to={redirect ? decodeURIComponent(redirect) : ROUTES.dashboard}
        replace
      />
    );
  }

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      await login(values);
      const redirect = params.get("redirect");
      navigate(redirect ? decodeURIComponent(redirect) : ROUTES.dashboard, {
        replace: true,
      });
    } catch {
      // 错误已由 http 拦截器统一提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 360 }}>
      <Typography.Title level={4} style={{ textAlign: "center", marginBottom: 8 }}>
        {APP_NAME}
      </Typography.Title>
      <Divider style={{ marginTop: 0 }} />
      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ username: "admin", password: "admin" }}
      >
        <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          登录
        </Button>
      </Form>
    </Card>
  );
}
