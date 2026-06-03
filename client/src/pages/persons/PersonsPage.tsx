import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { personsService, type Person } from "../../api/services/persons";
import { formatDateTime } from "../../utils/format";
import { PersonFormDrawer } from "./PersonFormDrawer";

export default function PersonsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["persons", { page, pageSize, keyword }],
    queryFn: () =>
      personsService.list({ page, pageSize, keyword: keyword || undefined }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["persons"] });

  const handleDelete = async (record: Person) => {
    try {
      await personsService.remove(record.id);
      message.success("已删除");
      refresh();
    } catch {
      // 接口错误由 http 拦截器提示
    }
  };

  const columns: TableColumnsType<Person> = [
    { title: "姓名", dataIndex: "fullName", key: "fullName" },
    {
      title: "头衔",
      dataIndex: "headline",
      key: "headline",
      render: (v: string | null) => v || "-",
    },
    {
      title: "国籍",
      dataIndex: "nationality",
      key: "nationality",
      render: (v: string | null) => v || "-",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setEditingId(record.id);
              setDrawerOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该人物？"
            description="将同时删除其经历;已建立的关系也会一并移除。"
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
          人物库
        </Typography.Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索姓名 / 头衔"
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            新建人物
          </Button>
        </Space>
      </div>

      <Table<Person>
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

      <PersonFormDrawer
        open={drawerOpen}
        editingId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
