import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  relationshipsService,
  REFERRAL_META,
  STAGE_META,
  STAGE_ORDER,
  STATUS_META,
  type ReferralPotential,
  type RelationshipFields,
  type RelationshipStage,
  type RelationshipStatus,
} from "../../api/services/relationships";
import {
  CHANNEL_META,
  DIRECTION_META,
  interactionsService,
  type Interaction,
} from "../../api/services/interactions";
import type {
  EducationExperience,
  WorkExperience,
} from "../../api/services/persons";
import { ROUTES } from "../../constants";
import { formatDateTime } from "../../utils/format";
import { InteractionFormModal } from "./InteractionFormModal";

const { Title, Text, Paragraph } = Typography;

function dateRange(start: string | null, end: string | null, current: boolean) {
  const left = start || "?";
  const right = current ? "至今" : end || "?";
  if (!start && !end && !current) return "";
  return `${left} ~ ${right}`;
}

export default function RelationshipDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const relQuery = useQuery({
    queryKey: ["relationship", id],
    queryFn: () => relationshipsService.get(id),
    enabled: Boolean(id),
  });
  const interactionsQuery = useQuery({
    queryKey: ["interactions", id],
    queryFn: () => interactionsService.list(id),
    enabled: Boolean(id),
  });

  const [form] = Form.useForm<RelationshipFields>();
  const [saving, setSaving] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<Interaction | null>(null);

  const rel = relQuery.data;

  useEffect(() => {
    if (rel) {
      form.setFieldsValue({
        stage: rel.stage,
        trustLevel: rel.trustLevel,
        valueRating: rel.valueRating,
        referralPotential: rel.referralPotential,
        status: rel.status,
        tags: rel.tags ?? "",
        context: rel.context ?? "",
        understanding: rel.understanding ?? "",
        privateNotes: rel.privateNotes ?? "",
      });
    }
  }, [rel, form]);

  if (relQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin />
      </div>
    );
  }
  if (!rel) {
    return <Empty description="关系不存在或无权访问" />;
  }

  const person = rel.person;

  const handleSaveRelationship = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await relationshipsService.update(id, {
        ...values,
        tags: values.tags || null,
        context: values.context || null,
        understanding: values.understanding || null,
        privateNotes: values.privateNotes || null,
      });
      message.success("已保存");
      queryClient.invalidateQueries({ queryKey: ["relationship", id] });
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
    } catch {
      // 接口错误已提示
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelationship = async () => {
    try {
      await relationshipsService.remove(id);
      message.success("已删除关系");
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      navigate(ROUTES.relationships);
    } catch {
      // 接口错误已提示
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    try {
      await interactionsService.remove(interactionId);
      message.success("已删除");
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
    } catch {
      // 接口错误已提示
    }
  };

  const refreshInteractions = () =>
    queryClient.invalidateQueries({ queryKey: ["interactions", id] });

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(ROUTES.relationships)}
        >
          返回
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {person.fullName}
        </Title>
        <Tag color={STAGE_META[rel.stage].color}>
          {STAGE_META[rel.stage].label}
        </Tag>
      </Space>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card
            title="人物资料（共享）"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="link"
                onClick={() => navigate(ROUTES.persons)}
                style={{ padding: 0 }}
              >
                在人物库编辑
              </Button>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="头衔" span={2}>
                {person.headline || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="国籍">
                {person.nationality || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="语言">
                {person.languages || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="LinkedIn" span={2}>
                {person.linkedinUrl || "-"}
              </Descriptions.Item>
            </Descriptions>

            <ExperienceList<WorkExperience>
              title="工作经历"
              items={person.workExperiences}
              primary={(w) => w.company}
              secondary={(w) => w.title}
              render={(w) => dateRange(w.startDate, w.endDate, w.isCurrent)}
            />
            <ExperienceList<EducationExperience>
              title="教育经历"
              items={person.educationExperiences}
              primary={(e) => e.school}
              secondary={(e) =>
                [e.program, e.major].filter(Boolean).join(" · ") || null
              }
              render={(e) => dateRange(e.startDate, e.endDate, e.isCurrent)}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="关系（仅自己可见）"
            style={{ marginBottom: 16 }}
            extra={
              <Popconfirm
                title="确认删除这段关系？"
                description="不影响共享的人物资料,但会删除你的互动记录。"
                onConfirm={handleDeleteRelationship}
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            }
          >
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="stage" label="阶段">
                    <Select
                      options={STAGE_ORDER.map((s: RelationshipStage) => ({
                        value: s,
                        label: STAGE_META[s].label,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="status" label="状态">
                    <Select
                      options={(
                        Object.keys(STATUS_META) as RelationshipStatus[]
                      ).map((s) => ({ value: s, label: STATUS_META[s] }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="trustLevel" label="信任度 (1-5)">
                    <InputNumber min={1} max={5} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="valueRating" label="价值 (1-5)">
                    <InputNumber min={1} max={5} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="referralPotential" label="可引荐潜力">
                    <Select
                      options={(
                        Object.keys(REFERRAL_META) as ReferralPotential[]
                      ).map((s) => ({ value: s, label: REFERRAL_META[s] }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="tags" label="标签">
                    <Input placeholder="逗号分隔" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="context" label="相识背景">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="understanding"
                    label="当前理解（对方项目/进展/困难的活摘要）"
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="privateNotes" label="私人备注">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" loading={saving} onClick={handleSaveRelationship}>
                保存关系
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card
        title="互动时间线"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingInteraction(null);
              setInteractionOpen(true);
            }}
          >
            记录互动
          </Button>
        }
      >
        {interactionsQuery.data?.items.length ? (
          <Timeline
            items={interactionsQuery.data.items.map((it) => ({
              children: (
                <InteractionItem
                  interaction={it}
                  onEdit={() => {
                    setEditingInteraction(it);
                    setInteractionOpen(true);
                  }}
                  onDelete={() => handleDeleteInteraction(it.id)}
                />
              ),
            }))}
          />
        ) : (
          <Empty description="还没有互动记录" />
        )}
      </Card>

      <InteractionFormModal
        open={interactionOpen}
        relationshipId={id}
        editing={editingInteraction}
        onClose={() => setInteractionOpen(false)}
        onSaved={refreshInteractions}
      />
    </div>
  );
}

function ExperienceList<T>({
  title,
  items,
  primary,
  secondary,
  render,
}: {
  title: string;
  items: T[];
  primary: (item: T) => string;
  secondary: (item: T) => string | null;
  render: (item: T) => string;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <Text type="secondary">{title}</Text>
      {items.map((item, index) => (
        <div key={index} style={{ marginTop: 4 }}>
          <Text strong>{primary(item)}</Text>
          {secondary(item) ? <Text> · {secondary(item)}</Text> : null}
          {render(item) ? (
            <Text type="secondary"> （{render(item)}）</Text>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function InteractionItem({
  interaction,
  onEdit,
  onDelete,
}: {
  interaction: Interaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <Space size="small" wrap>
        <Text strong>{formatDateTime(interaction.occurredAt, "YYYY-MM-DD HH:mm")}</Text>
        <Tag>{CHANNEL_META[interaction.channel]}</Tag>
        {interaction.direction ? (
          <Tag color="blue">{DIRECTION_META[interaction.direction]}</Tag>
        ) : null}
        <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title="删除这条互动？" onConfirm={onDelete}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
      <Paragraph style={{ margin: "4px 0 0" }}>{interaction.summary}</Paragraph>
      {interaction.learned ? (
        <Paragraph type="secondary" style={{ margin: "2px 0 0" }}>
          了解到：{interaction.learned}
        </Paragraph>
      ) : null}
      {interaction.nextStep ? (
        <Paragraph type="secondary" style={{ margin: "2px 0 0" }}>
          下一步：{interaction.nextStep}
        </Paragraph>
      ) : null}
    </div>
  );
}
