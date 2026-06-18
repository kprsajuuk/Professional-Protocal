import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { CloudDownloadOutlined, DatabaseOutlined } from "@ant-design/icons";
import { useState } from "react";
import {
  systemService,
  type BackupFileInfo,
  type BackupSummary,
} from "../../api/services/system";
import { formatDateTime } from "../../utils/format";
import { AiProvidersCard } from "./AiProvidersCard";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 系统管理页（仅管理员）：当前承载「数据备份」，后续系统级功能也归到这里。
export default function SystemPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [backingUp, setBackingUp] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["system", "backups"],
    queryFn: () => systemService.listBackups(),
  });

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const summary: BackupSummary = await systemService.createBackup();
      const total = summary.tables.reduce((sum, t) => sum + t.rows, 0);
      message.success(
        `备份完成：${summary.fileName}（${summary.tables.length} 张表 / ${total} 行）`,
      );
      queryClient.invalidateQueries({ queryKey: ["system", "backups"] });
    } catch {
      // 接口错误由 http 拦截器提示
    } finally {
      setBackingUp(false);
    }
  };

  const columns: TableColumnsType<BackupFileInfo> = [
    {
      title: "文件名",
      dataIndex: "fileName",
      key: "fileName",
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: "大小",
      dataIndex: "sizeBytes",
      key: "sizeBytes",
      width: 120,
      render: (v: number) => formatBytes(v),
    },
    {
      title: "生成时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
        系统管理
      </Typography.Title>

      <Card
        title={
          <Space>
            <DatabaseOutlined />
            数据备份
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={backingUp}
            onClick={handleBackup}
          >
            立即备份
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          将整库导出为一份自描述 JSON（含数据、列描述与迁移版本戳），保存在后端服务器目录下，
          可在重置数据库前留底、迁移后用 <Typography.Text code>db:import</Typography.Text> 导回。
        </Typography.Paragraph>

        {data?.dir && (
          <Typography.Paragraph style={{ marginBottom: 16 }}>
            <Tag color="blue">备份目录</Tag>
            <Typography.Text copyable code>
              {data.dir}
            </Typography.Text>
          </Typography.Paragraph>
        )}

        <Table<BackupFileInfo>
          rowKey="fileName"
          size="small"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: "暂无备份，点击右上角「立即备份」生成第一份" }}
        />
      </Card>

      <div style={{ marginTop: 16 }}>
        <AiProvidersCard />
      </div>
    </div>
  );
}
