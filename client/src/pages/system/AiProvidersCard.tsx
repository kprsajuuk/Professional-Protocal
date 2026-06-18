import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { RobotOutlined } from "@ant-design/icons";
import {
  aiService,
  PROVIDER_KIND_LABEL,
  type AiProvider,
} from "../../api/services/ai";
import { ProviderFormModal } from "./ProviderFormModal";

export function AiProvidersCard() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiProvider | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["ai", "providers"],
    queryFn: () => aiService.listProviders(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["ai", "providers"] });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (record: AiProvider) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleDelete = async (record: AiProvider) => {
    try {
      await aiService.removeProvider(record.id);
      message.success("已删除");
      refresh();
    } catch {
      // 拦截器提示
    }
  };

  const handleSetDefault = async (record: AiProvider) => {
    try {
      await aiService.updateProvider(record.id, { isDefault: true, enabled: true });
      message.success(`已设为默认：${record.name}`);
      refresh();
    } catch {
      // 拦截器提示
    }
  };

  const columns: TableColumnsType<AiProvider> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (v: string, r) => (
        <Space>
          {v}
          {r.isDefault && <Tag color="gold">默认</Tag>}
          {!r.enabled && <Tag>停用</Tag>}
        </Space>
      ),
    },
    {
      title: "类型",
      dataIndex: "kind",
      key: "kind",
      render: (k: AiProvider["kind"]) => PROVIDER_KIND_LABEL[k],
    },
    {
      title: "模型",
      dataIndex: "model",
      key: "model",
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: "Base URL",
      dataIndex: "baseUrl",
      key: "baseUrl",
      ellipsis: true,
    },
    {
      title: "Key",
      dataIndex: "hasApiKey",
      key: "hasApiKey",
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">已设</Tag> : <Tag>无</Tag>),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            disabled={record.isDefault}
            onClick={() => handleSetDefault(record)}
          >
            设默认
          </Button>
          <Popconfirm
            title="确认删除该端点？"
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          AI 模型端点
        </Space>
      }
      extra={
        <Button type="primary" onClick={openCreate}>
          新增端点
        </Button>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        配置可调用的大模型端点（统一走 OpenAI 兼容协议，本地 Ollama 填{" "}
        <Typography.Text code>http://&lt;服务器&gt;:11434/v1</Typography.Text>{" "}
        即可）。「默认」端点供「AI 破冰建议」调用。
      </Typography.Paragraph>

      <Table<AiProvider>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isFetching}
        pagination={false}
        locale={{ emptyText: "暂无端点，点击右上角「新增端点」添加（默认本地 Ollama）" }}
      />

      <ProviderFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
    </Card>
  );
}
