import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { usersService, type User } from "../../api/services/users";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../utils/format";
import { UserFormModal } from "./UserFormModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["users", { page, pageSize, keyword }],
    queryFn: () => usersService.list({ page, pageSize, keyword: keyword || undefined }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const handleDelete = async (record: User) => {
    try {
      await usersService.remove(record.id);
      message.success("已删除");
      refresh();
    } catch {
      // 接口错误由 http 拦截器提示
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: User) => {
    setEditing(record);
    setFormOpen(true);
  };

  const columns: TableColumnsType<User> = [
    { title: "用户名", dataIndex: "username", key: "username" },
    { title: "显示名", dataIndex: "displayName", key: "displayName" },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      render: (v: string | null) => v || "-",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (role: User["role"]) =>
        role === "admin" ? (
          <Tag color="gold">管理员</Tag>
        ) : (
          <Tag>普通用户</Tag>
        ),
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id;
        return (
          <Space size="small">
            <Button size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button size="small" onClick={() => setResetTarget(record)}>
              重置密码
            </Button>
            <Popconfirm
              title="确认删除该用户？"
              onConfirm={() => handleDelete(record)}
              disabled={isSelf}
            >
              <Button size="small" danger disabled={isSelf}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          用户管理
        </Typography.Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索用户名"
            style={{ width: 220 }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
          />
          <Button type="primary" onClick={openCreate}>
            新建用户
          </Button>
        </Space>
      </div>

      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isFetching}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />

      <UserFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <ResetPasswordModal
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
}
