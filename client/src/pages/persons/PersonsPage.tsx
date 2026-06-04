import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import {
  personsService,
  type Gender,
  type ListPersonsQuery,
  type Person,
} from "../../api/services/persons";
import {
  companiesService,
  schoolsService,
} from "../../api/services/lookups";
import { LookupSelect } from "../../components/LookupSelect";
import { formatDateTime } from "../../utils/format";
import { PersonFormDrawer } from "./PersonFormDrawer";

type SortField = NonNullable<ListPersonsQuery["sort"]>;
type Order = NonNullable<ListPersonsQuery["order"]>;

export default function PersonsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [sort, setSort] = useState<SortField>("updatedAt");
  const [order, setOrder] = useState<Order>("desc");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["persons", { page, pageSize, keyword, gender, schoolId, companyId, sort, order }],
    queryFn: () =>
      personsService.list({
        page,
        pageSize,
        keyword: keyword || undefined,
        gender,
        schoolId,
        companyId,
        sort,
        order,
      }),
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

      <Space wrap style={{ marginBottom: 16 }}>
        <Select<Gender>
          allowClear
          placeholder="性别"
          style={{ width: 110 }}
          value={gender}
          onChange={(v) => {
            setGender(v);
            setPage(1);
          }}
          options={[
            { value: "male", label: "男" },
            { value: "female", label: "女" },
            { value: "other", label: "其他" },
          ]}
        />
        <LookupSelect
          search={schoolsService.search}
          placeholder="按学校筛选"
          style={{ width: 200 }}
          value={schoolId}
          onChange={(v) => {
            setSchoolId(v);
            setPage(1);
          }}
        />
        <LookupSelect
          search={companiesService.search}
          placeholder="按当前公司筛选"
          style={{ width: 200 }}
          value={companyId}
          onChange={(v) => {
            setCompanyId(v);
            setPage(1);
          }}
        />
        <Select<SortField>
          style={{ width: 140 }}
          value={sort}
          onChange={(v) => setSort(v)}
          options={[
            { value: "updatedAt", label: "按更新时间" },
            { value: "birthYear", label: "按年龄" },
          ]}
        />
        <Segmented<Order>
          value={order}
          onChange={setOrder}
          options={[
            { value: "desc", label: "降序" },
            { value: "asc", label: "升序" },
          ]}
        />
      </Space>

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
