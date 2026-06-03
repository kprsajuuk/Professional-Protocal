import { useState } from "react";
import { Button, Card, Descriptions, Tag, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { formatDateTime } from "../../utils/format";

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwdOpen, setPwdOpen] = useState(false);

  return (
    <div style={{ maxWidth: 720 }}>
      <Typography.Title level={3}>个人信息</Typography.Title>
      <Card
        title={user?.displayName || user?.username || "我的账号"}
        extra={
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={() => setPwdOpen(true)}
          >
            修改密码
          </Button>
        }
      >
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="用户名">
            {user?.username ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="显示名">
            {user?.displayName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {user?.email || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.role === "admin" ? (
              <Tag color="gold">管理员</Tag>
            ) : (
              <Tag>普通用户</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {user?.enabled ? (
              <Tag color="green">启用</Tag>
            ) : (
              <Tag color="red">停用</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDateTime(user?.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDateTime(user?.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
