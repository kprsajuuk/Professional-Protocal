import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import {
  relationshipsService,
  STAGE_META,
  STAGE_ORDER,
  type RelationshipListItem,
  type RelationshipStage,
} from "../../api/services/relationships";
import { ROUTES } from "../../constants";
import { formatDateTime } from "../../utils/format";
import { CreateRelationshipModal } from "./CreateRelationshipModal";

type StageFilter = RelationshipStage | "all";

export default function RelationshipsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["relationships", { page, pageSize, keyword, stage }],
    queryFn: () =>
      relationshipsService.list({
        page,
        pageSize,
        keyword: keyword || undefined,
        stage: stage === "all" ? undefined : stage,
      }),
    placeholderData: keepPreviousData,
  });

  const columns: TableColumnsType<RelationshipListItem> = [
    {
      title: "姓名",
      key: "fullName",
      render: (_, r) => r.person.fullName,
    },
    {
      title: "头衔",
      key: "headline",
      render: (_, r) => r.person.headline || "-",
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
      render: (s: RelationshipStage) => (
        <Tag color={STAGE_META[s].color}>{STAGE_META[s].label}</Tag>
      ),
    },
    {
      title: "信任",
      dataIndex: "trustLevel",
      key: "trustLevel",
      render: (v: number | null) => (v ? `${v}/5` : "-"),
    },
    {
      title: "价值",
      dataIndex: "valueRating",
      key: "valueRating",
      render: (v: number | null) => (v ? `${v}/5` : "-"),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v: string) => formatDateTime(v),
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
          我的关系
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
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            建立关系
          </Button>
        </Space>
      </div>

      <Segmented<StageFilter>
        style={{ marginBottom: 16 }}
        value={stage}
        onChange={(value) => {
          setStage(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: "全部" },
          ...STAGE_ORDER.map((s) => ({ value: s, label: STAGE_META[s].label })),
        ]}
      />

      <Table<RelationshipListItem>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isFetching}
        onRow={(record) => ({
          onClick: () => navigate(`${ROUTES.relationships}/${record.id}`),
          style: { cursor: "pointer" },
        })}
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

      <CreateRelationshipModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
