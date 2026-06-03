import { z } from "zod";
import type { RelationshipRow } from "../../db/schema";
import {
  createPersonBodySchema,
  personDetailSchema,
} from "../persons/persons.schema";

export const stageEnum = z.enum([
  "identified",
  "connected",
  "engaged",
  "trusted",
  "advocate",
]);
export const referralEnum = z.enum([
  "unknown",
  "unlikely",
  "possible",
  "likely",
]);
export const statusEnum = z.enum(["active", "paused", "archived"]);

export function toRelationship(row: RelationshipRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    personId: row.personId,
    stage: row.stage,
    trustLevel: row.trustLevel,
    valueRating: row.valueRating,
    referralPotential: row.referralPotential,
    context: row.context,
    tags: row.tags,
    status: row.status,
    understanding: row.understanding,
    privateNotes: row.privateNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const relationshipSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  personId: z.string(),
  stage: stageEnum,
  trustLevel: z.number().nullable(),
  valueRating: z.number().nullable(),
  referralPotential: referralEnum,
  context: z.string().nullable(),
  tags: z.string().nullable(),
  status: statusEnum,
  understanding: z.string().nullable(),
  privateNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 人物概要（列表用）。
export const personSummarySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  headline: z.string().nullable(),
});

export const relationshipListItemSchema = relationshipSchema.extend({
  person: personSummarySchema,
});

export const relationshipDetailSchema = relationshipSchema.extend({
  person: personDetailSchema,
});

export const listRelationshipsResponseSchema = z.object({
  items: z.array(relationshipListItemSchema),
  total: z.number(),
});

// 关系可编辑字段。
const editableFields = {
  stage: stageEnum.optional(),
  trustLevel: z.number().int().min(1).max(5).nullish(),
  valueRating: z.number().int().min(1).max(5).nullish(),
  referralPotential: referralEnum.optional(),
  context: z.string().trim().max(2000).nullish(),
  tags: z.string().trim().max(500).nullish(),
  status: statusEnum.optional(),
  understanding: z.string().trim().max(5000).nullish(),
  privateNotes: z.string().trim().max(5000).nullish(),
};

// 创建：挂已有 person（personId）或同时新建 person（person）二选一。
export const createRelationshipBodySchema = z
  .object({
    personId: z.string().optional(),
    person: createPersonBodySchema.optional(),
    ...editableFields,
  })
  .refine((v) => Boolean(v.personId) !== Boolean(v.person), {
    message: "personId 与 person 必须且只能提供其一",
  });

export const updateRelationshipBodySchema = z.object(editableFields);

export const listRelationshipsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional(),
  stage: stageEnum.optional(),
  status: statusEnum.optional(),
});

export const relationshipIdParamSchema = z.object({ id: z.string() });

export const okResponseSchema = z.object({ ok: z.boolean() });

export type CreateRelationshipBody = z.infer<
  typeof createRelationshipBodySchema
>;
export type UpdateRelationshipBody = z.infer<
  typeof updateRelationshipBodySchema
>;
