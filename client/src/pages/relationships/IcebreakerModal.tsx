import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { CopyOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import { aiService, type IcebreakerResult } from "../../api/services/ai";

interface IcebreakerModalProps {
  open: boolean;
  relationshipId: string;
  personName: string;
  onClose: () => void;
}

// AI 破冰建议弹窗：产物只是草稿，需人确认后手动发出。见 Memory/AI.md。
export function IcebreakerModal({
  open,
  relationshipId,
  personName,
  onClose,
}: IcebreakerModalProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IcebreakerResult | null>(null);
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState(false);

  const generate = async () => {
    setLoading(true);
    setFailed(false);
    setResult(null);
    setDraft("");
    try {
      const res = await aiService.icebreaker(relationshipId);
      setResult(res);
      setDraft(res.draftMessage);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      message.success("草稿已复制");
    } catch {
      message.warning("复制失败，请手动选择文本");
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          AI 破冰建议 · {personName}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnHidden
      afterOpenChange={(opened) => {
        if (opened) void generate();
      }}
      footer={
        <div style={{ display: "flex", alignItems: "center" }}>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={generate}>
            重新生成
          </Button>
          <Space style={{ marginLeft: "auto" }}>
            <Button onClick={onClose}>关闭</Button>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              disabled={!draft}
              onClick={handleCopy}
            >
              复制草稿
            </Button>
          </Space>
        </div>
      }
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="这是 AI 基于你录入的事实生成的草稿与判断，仅供参考。请你审阅、修改后再手动发出；发出后记得手动记一条互动。"
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : failed ? (
        <Empty />
      ) : result ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {result.assessment && (
            <div>
              <Typography.Text type="secondary">破冰评估</Typography.Text>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {result.assessment}
              </Typography.Paragraph>
            </div>
          )}
          {result.angle && (
            <div>
              <Typography.Text type="secondary">切入角度 / 身份</Typography.Text>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {result.angle}
              </Typography.Paragraph>
            </div>
          )}
          <div>
            <Typography.Text type="secondary">
              首条消息草稿（可编辑）
            </Typography.Text>
            <Input.TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoSize={{ minRows: 4, maxRows: 12 }}
              style={{ marginTop: 4 }}
            />
          </div>
          {result.raw && (
            <Alert
              type="info"
              showIcon
              message="模型未按结构化格式返回，已把原始输出放入草稿框，请自行整理。"
            />
          )}
          <Tag>
            来自端点：{result.provider.name}（{result.provider.model}）
          </Tag>
        </Space>
      ) : null}
    </Modal>
  );
}

function Empty() {
  return (
    <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>
      生成失败。请确认已在「系统管理 → AI 模型端点」配置并设为默认的可用端点，然后重试。
    </Typography.Paragraph>
  );
}
