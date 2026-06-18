import { z } from "zod";
import type { AiProviderRow } from "../../db/schema";

// ── 对外表示 ───────────────────────────────────────────────────────
// apiKey 不回传明文，只回传「是否已设置」，避免泄露。
export function toProvider(row: AiProviderRow) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    baseUrl: row.baseUrl,
    hasApiKey: Boolean(row.apiKey && row.apiKey.trim()),
    model: row.model,
    params: row.params,
    enabled: row.enabled,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const kindEnum = z.enum(["openai-compatible", "anthropic", "gemini"]);

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: kindEnum,
  baseUrl: z.string(),
  hasApiKey: z.boolean(),
  model: z.string(),
  params: z.string().nullable(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listProvidersResponseSchema = z.object({
  items: z.array(providerSchema),
});

// 可选 JSON 文本校验：留空或合法 JSON。
const paramsField = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => {
      if (!v) return true;
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "params 需为合法 JSON" },
  )
  .nullish();

export const createProviderBodySchema = z.object({
  name: z.string().trim().min(1, "名称不能为空"),
  kind: kindEnum.default("openai-compatible"),
  baseUrl: z.string().trim().url("baseUrl 需为合法 URL"),
  apiKey: z.string().trim().max(500).nullish(),
  model: z.string().trim().min(1, "模型不能为空"),
  params: paramsField,
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

// 更新：所有字段可选；apiKey 省略=不变，传空串=清空。
export const updateProviderBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  kind: kindEnum.optional(),
  baseUrl: z.string().trim().url().optional(),
  apiKey: z.string().trim().max(500).nullish(),
  model: z.string().trim().min(1).optional(),
  params: paramsField,
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// 测试连接：用已存 provider（id）或内联配置。
export const testProviderBodySchema = z.object({
  id: z.string().optional(),
  baseUrl: z.string().trim().url().optional(),
  apiKey: z.string().trim().max(500).nullish(),
  model: z.string().trim().optional(),
});

export const testProviderResponseSchema = z.object({
  ok: z.boolean(),
  models: z.array(z.string()),
});

export const providerIdParamSchema = z.object({ id: z.string() });

export const okResponseSchema = z.object({ ok: z.boolean() });

// ── 破冰建议 ───────────────────────────────────────────────────────
export const icebreakerParamSchema = z.object({ id: z.string() });

export const icebreakerResponseSchema = z.object({
  assessment: z.string(),
  angle: z.string(),
  draftMessage: z.string(),
  raw: z.string().optional(),
  provider: z.object({ id: z.string(), name: z.string(), model: z.string() }),
});

export type CreateProviderBody = z.infer<typeof createProviderBodySchema>;
export type UpdateProviderBody = z.infer<typeof updateProviderBodySchema>;
export type TestProviderBody = z.infer<typeof testProviderBodySchema>;
