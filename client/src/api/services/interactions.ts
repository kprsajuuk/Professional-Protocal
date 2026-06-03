import { request } from "../request";

export type InteractionChannel =
  | "linkedin"
  | "email"
  | "message"
  | "call"
  | "meeting"
  | "event"
  | "referral"
  | "other";
export type InteractionDirection = "outbound" | "inbound" | "mutual";

export interface Interaction {
  id: string;
  relationshipId: string;
  occurredAt: string;
  channel: InteractionChannel;
  direction: InteractionDirection | null;
  summary: string;
  learned: string | null;
  nextStep: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionPayload {
  occurredAt: string;
  channel: InteractionChannel;
  direction?: InteractionDirection | null;
  summary: string;
  learned?: string | null;
  nextStep?: string | null;
}

// 互动时间线(账号私有)接口。
export const interactionsService = {
  list: (relationshipId: string) =>
    request.get<{ items: Interaction[] }>(
      `/relationships/${relationshipId}/interactions`,
    ),
  create: (relationshipId: string, payload: InteractionPayload) =>
    request.post<Interaction>(
      `/relationships/${relationshipId}/interactions`,
      payload,
    ),
  update: (id: string, payload: Partial<InteractionPayload>) =>
    request.patch<Interaction>(`/interactions/${id}`, payload),
  remove: (id: string) => request.delete<{ ok: boolean }>(`/interactions/${id}`),
};

export const CHANNEL_META: Record<InteractionChannel, string> = {
  linkedin: "LinkedIn",
  email: "邮件",
  message: "消息",
  call: "电话",
  meeting: "会面",
  event: "活动",
  referral: "引荐",
  other: "其他",
};

export const DIRECTION_META: Record<InteractionDirection, string> = {
  outbound: "我发起",
  inbound: "对方发起",
  mutual: "双向",
};
