import { useEffect, useState } from "react";
import { App, Form, Input, Modal, Select, Switch } from "antd";
import {
  usersService,
  type CreateUserPayload,
  type UpdateUserPayload,
  type User,
  type UserRole,
} from "../../api/services/users";

interface UserFormModalProps {
  open: boolean;
  // 传入则为编辑，否则为新建。
  editing: User | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  password: string;
  enabled: boolean;
}

// 新建 / 编辑用户弹窗。新建时包含用户名与初始密码；编辑时用户名不可改、不在此处改密。
export function UserFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        username: editing.username,
        displayName: editing.displayName,
        email: editing.email ?? "",
        role: editing.role,
        enabled: editing.enabled,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: "user", enabled: true });
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const email = values.email?.trim() ? values.email.trim() : null;
      if (editing) {
        const payload: UpdateUserPayload = {
          displayName: values.displayName ?? "",
          email,
          role: values.role,
          enabled: values.enabled,
        };
        await usersService.update(editing.id, payload);
        message.success("已保存");
      } else {
        const payload: CreateUserPayload = {
          username: values.username.trim(),
          displayName: values.displayName ?? "",
          email,
          role: values.role,
          password: values.password,
        };
        await usersService.create(payload);
        message.success("已创建");
      }
      onSaved();
      onClose();
    } catch {
      // 校验错误由表单提示；接口错误由 http 拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑用户" : "新建用户"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: "请输入用户名" }]}
        >
          <Input disabled={isEdit} autoComplete="off" />
        </Form.Item>
        <Form.Item name="displayName" label="显示名">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ type: "email", message: "邮箱格式不正确" }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="role" label="角色" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "user", label: "普通用户" },
              { value: "admin", label: "管理员" },
            ]}
          />
        </Form.Item>
        {!isEdit && (
          <Form.Item
            name="password"
            label="初始密码"
            rules={[
              { required: true, message: "请输入初始密码" },
              { min: 4, message: "密码至少 4 位" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}
        {isEdit && (
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
