import { useState } from "react";
import { Button, Card, Form, Input, Typography } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { APP_NAME, ROUTES } from "../../constants";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);

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
      <Typography.Title level={4} style={{ textAlign: "center" }}>
        {APP_NAME}
      </Typography.Title>
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
