import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import {
  aiService,
  PROVIDER_KIND_LABEL,
  type AiProvider,
  type ProviderKind,
} from "../../api/services/ai";

interface ProviderFormModalProps {
  open: boolean;
  editing: AiProvider | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  params: string;
  enabled: boolean;
  isDefault: boolean;
}

const emptyValues: FormValues = {
  name: "",
  kind: "openai-compatible",
  baseUrl: "",
  model: "",
  apiKey: "",
  params: "",
  enabled: true,
  isDefault: false,
};

export function ProviderFormModal({
  open,
  editing,
  onClose,
}: ProviderFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        kind: editing.kind,
        baseUrl: editing.baseUrl,
        model: editing.model,
        apiKey: "",
        params: editing.params ?? "",
        enabled: editing.enabled,
        isDefault: editing.isDefault,
      });
    } else {
      form.resetFields();
      form.setFieldsValue(emptyValues);
    }
  }, [open, editing, form]);

  const handleTest = async () => {
    const { baseUrl, model, apiKey } = form.getFieldsValue();
    if (!baseUrl) {
      message.warning("请先填写 baseUrl");
      return;
    }
    setTesting(true);
    try {
      // 编辑态且未输入新 key 时，用已存 provider 的配置（带 id）。
      const res = await aiService.testProvider(
        editing && !apiKey
          ? { id: editing.id, baseUrl, model }
          : { baseUrl, apiKey: apiKey || null, model },
      );
      message.success(
        `连接成功，可用模型 ${res.models.length} 个${
          res.models.length ? `：${res.models.slice(0, 5).join(", ")}` : ""
        }`,
      );
    } catch {
      // 错误由 http 拦截器提示
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const base = {
        name: values.name,
        kind: values.kind,
        baseUrl: values.baseUrl,
        model: values.model,
        params: values.params?.trim() ? values.params.trim() : null,
        enabled: values.enabled,
        isDefault: values.isDefault,
      };
      if (editing) {
        await aiService.updateProvider(editing.id, {
          ...base,
          // 留空表示不修改 key；填了才更新。
          ...(values.apiKey ? { apiKey: values.apiKey } : {}),
        });
        message.success("已保存");
      } else {
        await aiService.createProvider({
          ...base,
          apiKey: values.apiKey || null,
        });
        message.success("已创建");
      }
      queryClient.invalidateQueries({ queryKey: ["ai", "providers"] });
      onClose();
    } catch {
      // 校验/接口错误已分别提示
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "编辑模型端点" : "新增模型端点"}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="保存"
      destroyOnHidden
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <Button
            icon={<ThunderboltOutlined />}
            loading={testing}
            onClick={handleTest}
          >
            测试连接
          </Button>
          <Space style={{ marginLeft: "auto" }}>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )}
    >
      <Form form={form} layout="vertical" initialValues={emptyValues} style={{ marginTop: 8 }}>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="如 本地 Ollama" />
        </Form.Item>
        <Form.Item name="kind" label="类型">
          <Select
            options={(
              Object.keys(PROVIDER_KIND_LABEL) as ProviderKind[]
            ).map((k) => ({
              value: k,
              label: PROVIDER_KIND_LABEL[k],
              disabled: k !== "openai-compatible",
            }))}
          />
        </Form.Item>
        <Form.Item
          name="baseUrl"
          label="Base URL"
          rules={[{ required: true, message: "请输入 baseUrl" }]}
          extra="OpenAI 兼容基址，如 http://<服务器>:11434/v1（不含 /chat/completions）"
        >
          <Input placeholder="http://192.168.1.10:11434/v1" />
        </Form.Item>
        <Form.Item
          name="model"
          label="模型"
          rules={[{ required: true, message: "请输入模型名" }]}
        >
          <Input placeholder="如 qwen2.5:32b / gpt-4o-mini" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label="API Key"
          extra={
            editing
              ? "留空表示不修改；本地 Ollama 等免鉴权端点可不填"
              : "本地 Ollama 等免鉴权端点可不填"
          }
        >
          <Input.Password placeholder={editing?.hasApiKey ? "已设置（留空不变）" : ""} />
        </Form.Item>
        <Form.Item
          name="params"
          label="额外参数（JSON，可选）"
          extra='如 {"temperature":0.7}'
        >
          <Input.TextArea rows={2} placeholder='{"temperature":0.7}' />
        </Form.Item>
        <Space size="large">
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          默认端点供「AI 破冰建议」调用；同一时间只有一个默认。
        </Typography.Paragraph>
      </Form>
    </Modal>
  );
}
