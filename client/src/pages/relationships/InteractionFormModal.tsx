import { useEffect, useState } from "react";
import { App, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  CHANNEL_META,
  DIRECTION_META,
  interactionsService,
  type Interaction,
  type InteractionChannel,
  type InteractionDirection,
} from "../../api/services/interactions";

interface InteractionFormModalProps {
  open: boolean;
  relationshipId: string;
  editing: Interaction | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  occurredAt: Dayjs;
  channel: InteractionChannel;
  direction?: InteractionDirection | null;
  summary: string;
  learned?: string;
  nextStep?: string;
}

export function InteractionFormModal({
  open,
  relationshipId,
  editing,
  onClose,
  onSaved,
}: InteractionFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        occurredAt: dayjs(editing.occurredAt),
        channel: editing.channel,
        direction: editing.direction,
        summary: editing.summary,
        learned: editing.learned ?? "",
        nextStep: editing.nextStep ?? "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ occurredAt: dayjs(), channel: "message" });
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const payload = {
        occurredAt: values.occurredAt.toISOString(),
        channel: values.channel,
        direction: values.direction ?? null,
        summary: values.summary,
        learned: values.learned || null,
        nextStep: values.nextStep || null,
      };
      if (editing) {
        await interactionsService.update(editing.id, payload);
        message.success("已保存");
      } else {
        await interactionsService.create(relationshipId, payload);
        message.success("已记录");
      }
      onSaved();
      onClose();
    } catch {
      // 校验/接口错误已分别提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editing ? "编辑互动" : "记录互动"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="occurredAt"
          label="发生时间"
          rules={[{ required: true, message: "请选择时间" }]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="channel" label="渠道" rules={[{ required: true }]}>
          <Select
            options={Object.entries(CHANNEL_META).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <Form.Item name="direction" label="方向">
          <Select
            allowClear
            options={Object.entries(DIRECTION_META).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="summary"
          label="互动内容"
          rules={[{ required: true, message: "请填写互动内容" }]}
        >
          <Input.TextArea rows={3} placeholder="这次聊了什么 / 做了什么" />
        </Form.Item>
        <Form.Item name="learned" label="了解到什么">
          <Input.TextArea rows={2} placeholder="对方的项目、进展、困难等新信息" />
        </Form.Item>
        <Form.Item name="nextStep" label="下一步">
          <Input placeholder="后续要做的动作" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
