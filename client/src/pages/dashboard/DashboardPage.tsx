import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Spin, Tag, Typography } from "antd";
import { systemService } from "../../api/services/system";
import { formatDateTime } from "../../utils/format";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: systemService.health,
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <Typography.Title level={3}>仪表盘</Typography.Title>
      <Card title="后端连通性 (/api/health)">
        {isLoading && <Spin />}
        {error && (
          <Alert
            type="warning"
            showIcon
            message="无法连接后端"
            description="请先在 server/ 目录运行 npm run dev 启动后端服务。"
          />
        )}
        {data && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tag color="green">{data.status}</Tag>
            <Typography.Text type="secondary">
              {formatDateTime(data.timestamp)}
            </Typography.Text>
          </div>
        )}
      </Card>
    </div>
  );
}
