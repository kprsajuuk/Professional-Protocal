import { z } from "zod";
import type { InteractionRow } from "../../db/schema";

export const channelEnum = z.enum([
  "linkedin",
  "email",
  "message",
  "call",
  "meeting",
  "event",
  "referral",
  "other",
]);
export const directionEnum = z.enum(["outbound", "inbound", "mutual"]);

export function toInteraction(row: InteractionRow) {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    occurredAt: row.occurredAt.toISOString(),
    channel: row.channel,
    direction: row.direction,
    summary: row.summary,
    learned: row.learned,
    nextStep: row.nextStep,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const interactionSchema = z.object({
  id: z.string(),
  relationshipId: z.string(),
  occurredAt: z.string(),
  channel: channelEnum,
  direction: directionEnum.nullable(),
  summary: z.string(),
  learned: z.string().nullable(),
  nextStep: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listInteractionsResponseSchema = z.object({
  items: z.array(interactionSchema),
});

export const createInteractionBodySchema = z.object({
  occurredAt: z.coerce.date(),
  channel: channelEnum.default("other"),
  direction: directionEnum.nullish(),
  summary: z.string().trim().min(1, "请填写互动内容"),
  learned: z.string().trim().max(5000).nullish(),
  nextStep: z.string().trim().max(2000).nullish(),
});

export const updateInteractionBodySchema = z.object({
  occurredAt: z.coerce.date().optional(),
  channel: channelEnum.optional(),
  direction: directionEnum.nullish(),
  summary: z.string().trim().min(1).optional(),
  learned: z.string().trim().max(5000).nullish(),
  nextStep: z.string().trim().max(2000).nullish(),
});

export const relationshipIdParamSchema = z.object({ id: z.string() });
export const interactionIdParamSchema = z.object({ id: z.string() });

export const okResponseSchema = z.object({ ok: z.boolean() });

export type CreateInteractionBody = z.infer<typeof createInteractionBodySchema>;
export type UpdateInteractionBody = z.infer<typeof updateInteractionBodySchema>;
