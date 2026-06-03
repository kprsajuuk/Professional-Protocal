import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { App, Form, Modal, Select, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { personsService } from "../../api/services/persons";
import {
  relationshipsService,
  STAGE_ORDER,
  STAGE_META,
  type RelationshipStage,
} from "../../api/services/relationships";
import { ROUTES } from "../../constants";

interface CreateRelationshipModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  personId: string;
  stage: RelationshipStage;
}

// 建立关系:从共享人物库中选择一个人 + 设定初始阶段。
// (新建全新人物请先去「人物库」录入。)
export function CreateRelationshipModal({
  open,
  onClose,
}: CreateRelationshipModalProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["persons", "picker", search],
    queryFn: () => personsService.list({ keyword: search || undefined, pageSize: 20 }),
    enabled: open,
  });

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const created = await relationshipsService.create({
        personId: values.personId,
        stage: values.stage,
      });
      message.success("已建立关系");
      form.resetFields();
      onClose();
      navigate(`${ROUTES.relationships}/${created.id}`);
    } catch {
      // 接口错误(如已存在关系)由 http 拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="建立关系"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <Form form={form} layout="vertical" initialValues={{ stage: "identified" }}>
        <Form.Item
          name="personId"
          label="选择人物"
          rules={[{ required: true, message: "请选择一个人物" }]}
        >
          <Select
            showSearch
            filterOption={false}
            placeholder="搜索姓名 / 头衔"
            loading={isFetching}
            onSearch={setSearch}
            notFoundContent={
              <Typography.Text type="secondary">
                没有匹配的人物,请先到「人物库」录入
              </Typography.Text>
            }
            options={(data?.items ?? []).map((p) => ({
              value: p.id,
              label: p.headline ? `${p.fullName} · ${p.headline}` : p.fullName,
            }))}
          />
        </Form.Item>
        <Form.Item name="stage" label="初始阶段" rules={[{ required: true }]}>
          <Select
            options={STAGE_ORDER.map((s) => ({
              value: s,
              label: STAGE_META[s].label,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
