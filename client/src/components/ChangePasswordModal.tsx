import { useState } from "react";
import { App, Form, Input, Modal } from "antd";
import { authService } from "../api/services/auth";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  oldPassword: string;
  newPassword: string;
  confirm: string;
}

// 自助修改密码弹窗（任意登录用户可用）。
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success("密码已修改");
      form.resetFields();
      onClose();
    } catch {
      // 错误已由 http 拦截器统一提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="修改密码"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="oldPassword"
          label="原密码"
          rules={[{ required: true, message: "请输入原密码" }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 4, message: "密码至少 4 位" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
