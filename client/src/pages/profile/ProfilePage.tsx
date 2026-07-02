import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  EditOutlined,
  InboxOutlined,
  LockOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { PersonFormDrawer } from "../persons/PersonFormDrawer";
import { profileService } from "../../api/services/profile";
import type { PersonPayload } from "../../api/services/persons";
import { formatDateTime } from "../../utils/format";

export default function ProfilePage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [personDrawerOpen, setPersonDrawerOpen] = useState(false);
  const [prefsForm] = Form.useForm();
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { data: profile, isFetching } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => profileService.get(),
  });

  const tokenQuery = useQuery({
    queryKey: ["me", "intakeToken"],
    queryFn: () => profileService.getIntakeToken(),
  });
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (profile?.preferences) prefsForm.setFieldsValue(profile.preferences);
  }, [profile?.preferences, prefsForm]);

  const refreshProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["me", "profile"] });

  const handleCreatePerson = async (payload: PersonPayload) => {
    await profileService.createPerson(payload);
    refreshProfile();
  };

  const handleSavePrefs = async () => {
    const values = await prefsForm.validateFields();
    setSavingPrefs(true);
    try {
      await profileService.updatePreferences(values);
      message.success("已保存");
      refreshProfile();
    } catch {
      // 拦截器提示
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleRotateToken = async () => {
    setRotating(true);
    try {
      await profileService.rotateIntakeToken();
      await queryClient.invalidateQueries({ queryKey: ["me", "intakeToken"] });
      message.success("已生成新的采集令牌");
    } catch {
      // 拦截器提示
    } finally {
      setRotating(false);
    }
  };

  const handleCopyToken = async () => {
    const token = tokenQuery.data?.token;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      message.success("已复制");
    } catch {
      message.warning("复制失败，请手动选择复制");
    }
  };

  const person = profile?.person ?? null;
  const intakeToken = tokenQuery.data?.token ?? null;

  return (
    <div style={{ maxWidth: 820 }}>
      <Typography.Title level={3}>个人信息</Typography.Title>

      <Card
        title={user?.displayName || user?.username || "我的账号"}
        extra={
          <Button
            icon={<LockOutlined />}
            onClick={() => setPwdOpen(true)}
          >
            修改密码
          </Button>
        }
      >
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="用户名">
            {user?.username ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="显示名">
            {user?.displayName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {user?.email || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.role === "admin" ? (
              <Tag color="gold">管理员</Tag>
            ) : (
              <Tag>普通用户</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDateTime(user?.createdAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 我的背景资料 = 一个 Person（复用人物模型与编辑表单）。见 Memory/AI.md。 */}
      <Card
        style={{ marginTop: 16 }}
        loading={isFetching}
        title="我的背景资料"
        extra={
          <Button
            icon={<EditOutlined />}
            onClick={() => setPersonDrawerOpen(true)}
          >
            {person ? "编辑背景" : "完善背景"}
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          这是「我」在关系图里的节点：姓名、经历、学校/公司。AI 破冰建议会用它来个性化。
        </Typography.Paragraph>
        {person ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">{person.fullName}</Descriptions.Item>
            {person.headline && (
              <Descriptions.Item label="一句话">{person.headline}</Descriptions.Item>
            )}
            <Descriptions.Item label="工作经历">
              {person.workExperiences.length
                ? person.workExperiences
                    .map(
                      (w) =>
                        `${w.company}${w.title ? ` · ${w.title}` : ""}${
                          w.isCurrent ? "（在职）" : ""
                        }`,
                    )
                    .join("；")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="教育经历">
              {person.educationExperiences.length
                ? person.educationExperiences
                    .map(
                      (e) =>
                        `${e.school}${e.program ? ` · ${e.program}` : ""}${
                          e.major ? ` · ${e.major}` : ""
                        }`,
                    )
                    .join("；")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="还没有填写背景资料" />
        )}
      </Card>

      {/* AI 人设/偏好（主观，面向 AI 定调）。见 Memory/AI.md。 */}
      <Card
        style={{ marginTop: 16 }}
        loading={isFetching}
        title={
          <Space>
            <RobotOutlined />
            AI 人设 / 偏好
          </Space>
        }
        extra={
          <Button type="primary" loading={savingPrefs} onClick={handleSavePrefs}>
            保存
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          给 AI「定调」用的主观信息，配合上面的背景资料一起喂给模型。可留空。
        </Typography.Paragraph>
        <Form form={prefsForm} layout="vertical">
          <Form.Item name="selfIntro" label="一句话定位">
            <Input placeholder="如 CMU MSE 在读，软件工程方向，27 年入学" />
          </Form.Item>
          <Form.Item name="offer" label="我能为对方带来什么">
            <Input.TextArea rows={2} placeholder="技能 / 资源 / 可交换的价值" />
          </Form.Item>
          <Form.Item name="lookingFor" label="我在找什么">
            <Input.TextArea rows={2} placeholder="目标岗位 / 行业 / 想了解的方向" />
          </Form.Item>
          <Form.Item name="tonePreference" label="语气偏好">
            <Input placeholder="如 真诚、简洁；中英文皆可" />
          </Form.Item>
          <Form.Item name="extraContext" label="其他常驻背景">
            <Input.TextArea rows={2} placeholder="任何想让 AI 始终知道的背景" />
          </Form.Item>
        </Form>
      </Card>

      {/* 采集令牌：供浏览器采集脚本（油猴）投递鉴权。见 Memory/DataGovernance.md。 */}
      <Card
        style={{ marginTop: 16 }}
        loading={tokenQuery.isFetching}
        title={
          <Space>
            <InboxOutlined />
            采集令牌
          </Space>
        }
        extra={
          <Popconfirm
            title={intakeToken ? "重置会使旧令牌立即失效" : "生成采集令牌"}
            description={
              intakeToken
                ? "已配置该令牌的脚本需要重新填入新令牌。"
                : undefined
            }
            onConfirm={handleRotateToken}
          >
            <Button loading={rotating}>{intakeToken ? "重置" : "生成"}</Button>
          </Popconfirm>
        }
      >
        <Typography.Paragraph type="secondary">
          浏览器采集脚本用这枚长效令牌向后端投递原文（免登录过期）。把它填进油猴脚本的「配置采集令牌」，脚本安装说明见仓库 <Typography.Text code>capture/</Typography.Text> 目录。请妥善保管，勿泄露。
        </Typography.Paragraph>
        {intakeToken ? (
          <Space.Compact style={{ width: "100%" }}>
            <Input.Password
              readOnly
              value={intakeToken}
              style={{ fontFamily: "monospace" }}
            />
            <Button onClick={handleCopyToken}>复制</Button>
          </Space.Compact>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有生成采集令牌"
          />
        )}
      </Card>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
      <PersonFormDrawer
        open={personDrawerOpen}
        editingId={profile?.personId ?? null}
        title={person ? "编辑我的背景资料" : "完善我的背景资料"}
        createWith={handleCreatePerson}
        onClose={() => setPersonDrawerOpen(false)}
        onSaved={refreshProfile}
      />
    </div>
  );
}
