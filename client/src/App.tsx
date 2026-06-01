import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { api } from "./api/client";

interface Health {
  status: string;
  timestamp: string;
}

export default function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<Health>("/health")).data,
  });

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <Typography.Title level={3}>Professional-Protocal</Typography.Title>
      <Typography.Paragraph type="secondary">
        长期人脉关系经营系统 · 前端骨架
      </Typography.Paragraph>

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
              {dayjs(data.timestamp).format("YYYY-MM-DD HH:mm:ss")}
            </Typography.Text>
          </div>
        )}
      </Card>
    </div>
  );
}
