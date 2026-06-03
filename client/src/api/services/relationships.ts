import { request } from "../request";
import type { PageResult } from "../types";
import type { PersonDetail, PersonPayload } from "./persons";

export type RelationshipStage =
  | "identified"
  | "connected"
  | "engaged"
  | "trusted"
  | "advocate";
export type ReferralPotential = "unknown" | "unlikely" | "possible" | "likely";
export type RelationshipStatus = "active" | "paused" | "archived";

export interface Relationship {
  id: string;
  ownerId: string;
  personId: string;
  stage: RelationshipStage;
  trustLevel: number | null;
  valueRating: number | null;
  referralPotential: ReferralPotential;
  context: string | null;
  tags: string | null;
  status: RelationshipStatus;
  understanding: string | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipListItem extends Relationship {
  person: { id: string; fullName: string; headline: string | null };
}

export interface RelationshipDetail extends Relationship {
  person: PersonDetail;
}

export interface RelationshipFields {
  stage?: RelationshipStage;
  trustLevel?: number | null;
  valueRating?: number | null;
  referralPotential?: ReferralPotential;
  context?: string | null;
  tags?: string | null;
  status?: RelationshipStatus;
  understanding?: string | null;
  privateNotes?: string | null;
}

// 建立关系:挂已有人物(personId)或同时新建人物(person)二选一。
export type CreateRelationshipPayload = RelationshipFields &
  ({ personId: string; person?: never } | { person: PersonPayload; personId?: never });

export interface ListRelationshipsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  stage?: RelationshipStage;
  status?: RelationshipStatus;
}

// 关系(账号私有)接口。
export const relationshipsService = {
  list: (query: ListRelationshipsQuery) =>
    request.get<PageResult<RelationshipListItem>>("/relationships", {
      params: query,
    }),
  get: (id: string) => request.get<RelationshipDetail>(`/relationships/${id}`),
  create: (payload: CreateRelationshipPayload) =>
    request.post<RelationshipDetail>("/relationships", payload),
  update: (id: string, payload: RelationshipFields) =>
    request.patch<RelationshipDetail>(`/relationships/${id}`, payload),
  remove: (id: string) =>
    request.delete<{ ok: boolean }>(`/relationships/${id}`),
};

// 阶段/潜力的中文标签与配色(供 UI 复用)。
export const STAGE_META: Record<
  RelationshipStage,
  { label: string; color: string }
> = {
  identified: { label: "识别", color: "default" },
  connected: { label: "已建联", color: "blue" },
  engaged: { label: "互动中", color: "cyan" },
  trusted: { label: "信任建立", color: "green" },
  advocate: { label: "可引荐", color: "gold" },
};

export const STAGE_ORDER: RelationshipStage[] = [
  "identified",
  "connected",
  "engaged",
  "trusted",
  "advocate",
];

export const REFERRAL_META: Record<ReferralPotential, string> = {
  unknown: "未知",
  unlikely: "不太可能",
  possible: "有可能",
  likely: "很可能",
};

export const STATUS_META: Record<RelationshipStatus, string> = {
  active: "活跃",
  paused: "搁置",
  archived: "归档",
};
