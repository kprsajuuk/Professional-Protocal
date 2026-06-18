import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  personsService,
  type PersonPayload,
} from "../../api/services/persons";
import {
  companiesService,
  schoolsService,
} from "../../api/services/lookups";
import { LookupAutoComplete } from "../../components/LookupAutoComplete";

interface PersonFormDrawerProps {
  open: boolean;
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
  // 覆盖「新建」行为（如把人物关联到当前账号）。仅在无 editingId 时生效。
  createWith?: (payload: PersonPayload) => Promise<unknown>;
  title?: string;
}

type FormValues = PersonPayload;

const emptyValues: FormValues = {
  fullName: "",
  gender: null,
  nationality: "",
  languages: "",
  birthYear: null,
  headline: "",
  linkedinUrl: "",
  handshakeUrl: "",
  otherLinks: "",
  workExperiences: [],
  educationExperiences: [],
};

// 人物新建/编辑抽屉:标量字段 + 动态的工作/教育经历(替换式提交)。
export function PersonFormDrawer({
  open,
  editingId,
  onClose,
  onSaved,
  createWith,
  title,
}: PersonFormDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["person", editingId],
    queryFn: () => personsService.get(editingId!),
    enabled: open && Boolean(editingId),
  });

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      form.resetFields();
      form.setFieldsValue(emptyValues);
      return;
    }
    const p = detailQuery.data;
    if (!p) return;
    form.setFieldsValue({
      fullName: p.fullName,
      gender: p.gender,
      nationality: p.nationality ?? "",
      languages: p.languages ?? "",
      birthYear: p.birthYear,
      headline: p.headline ?? "",
      linkedinUrl: p.linkedinUrl ?? "",
      handshakeUrl: p.handshakeUrl ?? "",
      otherLinks: p.otherLinks ?? "",
      workExperiences: p.workExperiences.map((w) => ({
        companyName: w.company,
        title: w.title ?? "",
        location: w.location ?? "",
        startDate: w.startDate ?? "",
        endDate: w.endDate ?? "",
        isCurrent: w.isCurrent,
        description: w.description ?? "",
      })),
      educationExperiences: p.educationExperiences.map((e) => ({
        schoolName: e.school,
        department: e.department ?? "",
        program: e.program ?? "",
        major: e.major ?? "",
        startDate: e.startDate ?? "",
        endDate: e.endDate ?? "",
        isCurrent: e.isCurrent,
        description: e.description ?? "",
      })),
    });
  }, [open, editingId, detailQuery.data, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const payload: PersonPayload = {
        ...values,
        workExperiences: values.workExperiences ?? [],
        educationExperiences: values.educationExperiences ?? [],
      };
      if (editingId) {
        await personsService.update(editingId, payload);
        queryClient.invalidateQueries({ queryKey: ["person", editingId] });
        message.success("已保存");
      } else if (createWith) {
        await createWith(payload);
        message.success("已创建");
      } else {
        await personsService.create(payload);
        message.success("已创建");
      }
      onSaved();
      onClose();
    } catch {
      // 校验错误由表单提示;接口错误由 http 拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={title ?? (editingId ? "编辑人物" : "新建人物")}
      width={640}
      open={open}
      onClose={onClose}
      loading={Boolean(editingId) && detailQuery.isFetching}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={emptyValues}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="姓名"
              rules={[{ required: true, message: "请输入姓名" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="headline" label="一句话头衔">
              <Input placeholder="如 SWE @ Google" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="gender" label="性别">
              <Select
                allowClear
                options={[
                  { value: "male", label: "男" },
                  { value: "female", label: "女" },
                  { value: "other", label: "其他" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="nationality" label="国籍">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="birthYear" label="出生年份">
              <InputNumber style={{ width: "100%" }} min={1900} max={2200} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="languages" label="语言">
              <Input placeholder="如 中文、英语" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="linkedinUrl" label="LinkedIn">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="handshakeUrl" label="Handshake">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="otherLinks" label="其他链接/来源">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start">工作经历</Divider>
        <Form.List name="workExperiences">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <ExperienceBlock key={field.key} onRemove={() => remove(field.name)}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name={[field.name, "companyName"]}
                        label="公司"
                        rules={[{ required: true, message: "请输入公司" }]}
                      >
                        <LookupAutoComplete
                          search={companiesService.search}
                          placeholder="搜索或输入公司"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[field.name, "title"]} label="职位">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[field.name, "startDate"]} label="开始">
                        <Input placeholder="2021 / 2021-06" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[field.name, "endDate"]} label="结束">
                        <Input placeholder="留空表示至今" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[field.name, "location"]} label="地点">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name={[field.name, "isCurrent"]}
                        valuePropName="checked"
                      >
                        <Checkbox>目前在职</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name={[field.name, "description"]} label="备注">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                  </Row>
                </ExperienceBlock>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ companyName: "", isCurrent: false })}
              >
                添加工作经历
              </Button>
            </>
          )}
        </Form.List>

        <Divider titlePlacement="start">教育经历</Divider>
        <Form.List name="educationExperiences">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <ExperienceBlock key={field.key} onRemove={() => remove(field.name)}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name={[field.name, "schoolName"]}
                        label="学校"
                        rules={[{ required: true, message: "请输入学校" }]}
                      >
                        <LookupAutoComplete
                          search={schoolsService.search}
                          placeholder="搜索或输入学校"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[field.name, "program"]} label="项目/学位">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[field.name, "department"]} label="院系">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[field.name, "major"]} label="专业">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[field.name, "startDate"]} label="开始">
                        <Input placeholder="2023" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[field.name, "endDate"]} label="结束">
                        <Input placeholder="留空表示在读" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={[field.name, "isCurrent"]}
                        valuePropName="checked"
                      >
                        <Checkbox>在读</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name={[field.name, "description"]} label="备注">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                  </Row>
                </ExperienceBlock>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ schoolName: "", isCurrent: false })}
              >
                添加教育经历
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
}

function ExperienceBlock({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        border: "1px solid rgba(128,128,128,0.25)",
        borderRadius: 8,
        padding: "12px 12px 0",
        marginBottom: 12,
      }}
    >
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={onRemove}
        style={{ position: "absolute", top: 4, right: 4 }}
      />
      {children}
    </div>
  );
}
