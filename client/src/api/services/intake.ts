import { request } from "../request";
import type { PageResult } from "../types";
import type {
  EducationExperienceInput,
  Gender,
  PersonPayload,
  WorkExperienceInput,
} from "./persons";

export type IntakeStatus = "pending" | "parsed" | "imported" | "discarded";

// AI 解析出的 Person 草稿（对齐 PersonPayload 形状，供预填表单）。见 Memory/DataGovernance.md。
export interface PersonDraft {
  fullName: string;
  gender: Gender | null;
  nationality: string | null;
  languages: string | null;
  birthYear: number | null;
  headline: string | null;
  linkedinUrl: string | null;
  handshakeUrl: string | null;
  otherLinks: string | null;
  workExperiences: WorkExperienceInput[];
  educationExperiences: EducationExperienceInput[];
}

export interface IntakeItem {
  id: string;
  ownerId: string;
  source: string;
  sourceUrl: string | null;
  rawContent: string;
  rawFormat: "text" | "html";
  capturedAt: string;
  status: IntakeStatus;
  parsedDraft: PersonDraft | null;
  parseError: string | null;
  personId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateHit {
  id: string;
  fullName: string;
  headline: string | null;
  linkedinUrl: string | null;
  reason: "linkedinUrl" | "name";
}

export interface IntakeDetail {
  item: IntakeItem;
  duplicates: DuplicateHit[];
}

export interface ListIntakeQuery {
  status?: IntakeStatus;
  page?: number;
  pageSize?: number;
}

// 采集条目（导入收件箱）接口。捕获投递由油猴脚本直连 POST /intake，不在此。
export const intakeService = {
  list: (query: ListIntakeQuery) =>
    request.get<PageResult<IntakeItem>>("/intake", { params: query }),
  get: (id: string) => request.get<IntakeDetail>(`/intake/${id}`),
  parse: (id: string) => request.post<IntakeDetail>(`/intake/${id}/parse`),
  import: (id: string, payload: PersonPayload) =>
    request.post<{ personId: string }>(`/intake/${id}/import`, payload),
  discard: (id: string) => request.post<{ ok: boolean }>(`/intake/${id}/discard`),
};
