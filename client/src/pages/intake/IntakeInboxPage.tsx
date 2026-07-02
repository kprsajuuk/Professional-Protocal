import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  theme as antdTheme,
  type TableColumnsType,
} from "antd";
import { RobotOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
  intakeService,
  type IntakeItem,
  type IntakeStatus,
} from "../../api/services/intake";
import type { PersonPayload } from "../../api/services/persons";
import { PersonFormDrawer } from "../persons/PersonFormDrawer";
import { formatDateTime } from "../../utils/format";

const STATUS_META: Record<IntakeStatus, { label: string; color?: string }> = {
  pending: { label: "待解析" },
  parsed: { label: "已解析", color: "blue" },
  imported: { label: "已入库", color: "green" },
  discarded: { label: "已丢弃", color: "default" },
};

type StatusFilter = IntakeStatus | "all";

export default function IntakeInboxPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { token } = antdTheme.useToken();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [personDrawerOpen, setPersonDrawerOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ["intake", "list", { statusFilter, page, pageSize }],
    queryFn: () =>
      intakeService.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const detailQuery = useQuery({
    queryKey: ["intake", "detail", selectedId],
    queryFn: () => intakeService.get(selectedId!),
    enabled: Boolean(selectedId),
  });

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: ["intake", "list"] });
  const refreshDetail = () =>
    queryClient.invalidateQueries({ queryKey: ["intake", "detail", selectedId] });

  const parseMutation = useMutation({
    mutationFn: (id: string) => intakeService.parse(id),
    onSuccess: (data) => {
      queryClient.setQueryData(["intake", "detail", data.item.id], data);
      refreshList();
      if (data.item.parseError) {
        message.error("解析失败，请查看详情里的错误信息");
      } else {
        message.success("已解析出草稿，请审阅后入库");
      }
    },
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => intakeService.discard(id),
    onSuccess: () => {
      message.success("已丢弃");
      refreshList();
      refreshDetail();
    },
  });

  const detail = detailQuery.data;
  const item = detail?.item;
  const duplicates = detail?.duplicates ?? [];

  // 采集草稿 → 表单预填值（PersonDraft 与 PersonPayload 形状一致）。
  const initialDraft = useMemo<PersonPayload | null>(
    () => (item?.parsedDraft ?? null) as PersonPayload | null,
    [item?.parsedDraft],
  );

  const handleImport = async (payload: PersonPayload) => {
    if (!selectedId) return;
    await intakeService.import(selectedId, payload);
    message.success("已入库到人物库");
    setPersonDrawerOpen(false);
    setSelectedId(null);
    refreshList();
  };

  const columns: TableColumnsType<IntakeItem> = [
    {
      title: "摘要",
      key: "summary",
      render: (_, r) =>
        r.parsedDraft?.fullName ||
        r.rawContent.slice(0, 40).replace(/\s+/g, " ") + "…",
    },
    { title: "来源", dataIndex: "source", key: "source", width: 100 },
    {
      title: "采集时间",
      dataIndex: "capturedAt",
      key: "capturedAt",
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: IntakeStatus) => (
        <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      render: (_, r) => (
        <Button size="small" onClick={() => setSelectedId(r.id)}>
          处理
        </Button>
      ),
    },
  ];

  const canImport = Boolean(item && item.status !== "imported" && item.parsedDraft);
  const canParse = Boolean(
    item && item.status !== "imported" && item.status !== "discarded",
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        导入收件箱
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        用浏览器采集脚本（油猴）在 LinkedIn 页面「采集到 PP」，原文会进这里。对每条点「AI
        解析」抽成 Person 草稿，审阅、查重、编辑后确认入库。脚本安装与令牌配置见「个人信息」页。
      </Typography.Paragraph>

      <Segmented<StatusFilter>
        style={{ marginBottom: 16 }}
        value={statusFilter}
        onChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        options={[
          { value: "pending", label: "待解析" },
          { value: "parsed", label: "已解析" },
          { value: "imported", label: "已入库" },
          { value: "discarded", label: "已丢弃" },
          { value: "all", label: "全部" },
        ]}
      />

      <Table<IntakeItem>
        rowKey="id"
        columns={columns}
        dataSource={listQuery.data?.items ?? []}
        loading={listQuery.isFetching}
        pagination={{
          current: page,
          pageSize,
          total: listQuery.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />

      <Drawer
        title="处理采集条目"
        width={720}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        loading={detailQuery.isFetching}
        destroyOnHidden
        extra={
          <Space>
            <Button
              icon={<RobotOutlined />}
              loading={parseMutation.isPending}
              disabled={!canParse}
              onClick={() => selectedId && parseMutation.mutate(selectedId)}
            >
              {item?.parsedDraft ? "重新解析" : "AI 解析"}
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              disabled={!canImport}
              onClick={() => setPersonDrawerOpen(true)}
            >
              编辑并入库
            </Button>
          </Space>
        }
      >
        {item && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="状态">
                <Tag color={STATUS_META[item.status].color}>
                  {STATUS_META[item.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="来源">{item.source}</Descriptions.Item>
              {item.sourceUrl && (
                <Descriptions.Item label="来源链接">
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                    {item.sourceUrl}
                  </a>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="采集时间">
                {formatDateTime(item.capturedAt)}
              </Descriptions.Item>
            </Descriptions>

            {item.parseError && (
              <Alert
                type="error"
                showIcon
                message="解析失败"
                description={item.parseError}
              />
            )}

            {duplicates.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="可能是重复人物"
                description={
                  <Space direction="vertical" size={2}>
                    {duplicates.map((d) => (
                      <span key={d.id}>
                        {d.fullName}
                        {d.headline ? ` · ${d.headline}` : ""}（
                        {d.reason === "linkedinUrl"
                          ? "LinkedIn 链接相同"
                          : "同名"}
                        ）
                      </span>
                    ))}
                    <Typography.Text type="secondary">
                      入库前请确认是否已存在；如是同一人可考虑放弃或后续手动合并。
                    </Typography.Text>
                  </Space>
                }
              />
            )}

            {item.parsedDraft ? (
              <Descriptions
                title="解析草稿（入库前可编辑）"
                column={1}
                bordered
                size="small"
              >
                <Descriptions.Item label="姓名">
                  {item.parsedDraft.fullName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="一句话">
                  {item.parsedDraft.headline || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="工作经历">
                  {item.parsedDraft.workExperiences.length
                    ? item.parsedDraft.workExperiences
                        .map(
                          (w) =>
                            `${w.companyName}${w.title ? ` · ${w.title}` : ""}`,
                        )
                        .join("；")
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="教育经历">
                  {item.parsedDraft.educationExperiences.length
                    ? item.parsedDraft.educationExperiences
                        .map(
                          (e) =>
                            `${e.schoolName}${e.program ? ` · ${e.program}` : ""}`,
                        )
                        .join("；")
                    : "-"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Alert
                type="info"
                showIcon
                message="尚未解析"
                description="点击右上角「AI 解析」，用默认模型端点把下面的原文抽成 Person 草稿。"
              />
            )}

            <div>
              <Typography.Text type="secondary">采集到的原文</Typography.Text>
              <div
                style={{
                  marginTop: 4,
                  maxHeight: 260,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: 12,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {item.rawContent}
              </div>
            </div>

            <Popconfirm
              title="确认丢弃这条采集条目？"
              onConfirm={() =>
                selectedId && discardMutation.mutate(selectedId)
              }
            >
              <Button danger disabled={item.status === "imported"}>
                丢弃
              </Button>
            </Popconfirm>
          </Space>
        )}
      </Drawer>

      <PersonFormDrawer
        open={personDrawerOpen}
        editingId={null}
        title="审阅并入库"
        initialDraft={initialDraft}
        createWith={handleImport}
        onClose={() => setPersonDrawerOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
}
