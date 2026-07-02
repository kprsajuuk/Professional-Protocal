import { z } from "zod";
import type { IntakeItemRow, PersonRow } from "../../db/schema";
import type { PersonDraft } from "../ai/ai.service";

// 采集条目的对外 DTO 与校验。见 Memory/DataGovernance.md。

// ── Person 草稿（对齐 createPersonBody 的形状，供前端预填）─────────────
const personDraftWorkSchema = z.object({
  companyName: z.string(),
  title: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
});

const personDraftEduSchema = z.object({
  schoolName: z.string(),
  department: z.string().nullable(),
  program: z.string().nullable(),
  major: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
});

export const personDraftSchema = z.object({
  fullName: z.string(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  nationality: z.string().nullable(),
  languages: z.string().nullable(),
  birthYear: z.number().nullable(),
  headline: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  handshakeUrl: z.string().nullable(),
  otherLinks: z.string().nullable(),
  workExperiences: z.array(personDraftWorkSchema),
  educationExperiences: z.array(personDraftEduSchema),
});

// ── 采集条目 ────────────────────────────────────────────────────────
export const intakeItemSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  rawContent: z.string(),
  rawFormat: z.enum(["text", "html"]),
  capturedAt: z.string(),
  status: z.enum(["pending", "parsed", "imported", "discarded"]),
  parsedDraft: personDraftSchema.nullable(),
  parseError: z.string().nullable(),
  personId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const duplicateSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  headline: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  reason: z.enum(["linkedinUrl", "name"]),
});

export const intakeDetailResponseSchema = z.object({
  item: intakeItemSchema,
  duplicates: z.array(duplicateSchema),
});

export const listIntakeResponseSchema = z.object({
  items: z.array(intakeItemSchema),
  total: z.number(),
});

export const okResponseSchema = z.object({ ok: z.boolean() });
export const importResponseSchema = z.object({ personId: z.string() });

// ── 入参 ────────────────────────────────────────────────────────────
export const captureBodySchema = z.object({
  source: z.string().trim().min(1).max(40).default("linkedin"),
  sourceUrl: z.string().trim().max(2000).nullish(),
  rawContent: z.string().min(1, "原文不能为空").max(200_000),
  rawFormat: z.enum(["text", "html"]).default("text"),
});

export const captureResponseSchema = z.object({ id: z.string() });

export const listIntakeQuerySchema = z.object({
  status: z.enum(["pending", "parsed", "imported", "discarded"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const intakeIdParamSchema = z.object({ id: z.string() });

// ── 映射器 ──────────────────────────────────────────────────────────
export function parseDraftText(text: string | null): PersonDraft | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as PersonDraft;
  } catch {
    return null;
  }
}

export function toIntakeItem(row: IntakeItemRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    source: row.source,
    sourceUrl: row.sourceUrl,
    rawContent: row.rawContent,
    rawFormat: row.rawFormat,
    capturedAt: row.capturedAt.toISOString(),
    status: row.status,
    parsedDraft: parseDraftText(row.parsedDraft),
    parseError: row.parseError,
    personId: row.personId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDuplicate(row: PersonRow, reason: "linkedinUrl" | "name") {
  return {
    id: row.id,
    fullName: row.fullName,
    headline: row.headline,
    linkedinUrl: row.linkedinUrl,
    reason,
  };
}
