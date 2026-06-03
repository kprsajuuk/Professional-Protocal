import { useState } from "react";
import { App, Form, Input, Modal } from "antd";
import { usersService, type User } from "../../api/services/users";

interface ResetPasswordModalProps {
  target: User | null;
  onClose: () => void;
}

interface FormValues {
  newPassword: string;
  confirm: string;
}

// 管理员重置指定用户密码。
export function ResetPasswordModal({ target, onClose }: ResetPasswordModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    if (!target) return;
    const values = await form.validateFields();
    setLoading(true);
    try {
      await usersService.resetPassword(target.id, values.newPassword);
      message.success("密码已重置");
      form.resetFields();
      onClose();
    } catch {
      // 接口错误由 http 拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={target ? `重置「${target.displayName || target.username}」的密码` : "重置密码"}
      open={Boolean(target)}
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
