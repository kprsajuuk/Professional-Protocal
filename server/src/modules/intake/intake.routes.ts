import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { intakeRepo } from "../../db/repositories/intake";
import { usersRepo } from "../../db/repositories/users";
import { personsRepo } from "../../db/repositories/persons";
import { aiProvidersRepo } from "../../db/repositories/aiProviders";
import { parsePersonFromRaw, type PersonDraft } from "../ai/ai.service";
import { createPersonBodySchema } from "../persons/persons.schema";
import {
  captureBodySchema,
  captureResponseSchema,
  importResponseSchema,
  intakeDetailResponseSchema,
  intakeIdParamSchema,
  listIntakeQuerySchema,
  listIntakeResponseSchema,
  okResponseSchema,
  parseDraftText,
  toDuplicate,
  toIntakeItem,
} from "./intake.schema";
import type { IntakeItemRow } from "../../db/schema";

// 采集条目：捕获层投递（token 鉴权）+ 收件箱审阅/解析/入库（owner 作用域）。见 Memory/DataGovernance.md。

// 根据草稿算查重候选：linkedinUrl 精确优先，否则姓名模糊。
async function computeDuplicates(draft: PersonDraft | null) {
  if (!draft) return [];
  const rows = await personsRepo.findDuplicateCandidates({
    linkedinUrl: draft.linkedinUrl,
    fullName: draft.fullName,
  });
  const target = draft.linkedinUrl?.trim();
  return rows.map((p) => {
    const reason =
      target && p.linkedinUrl && p.linkedinUrl.trim() === target
        ? ("linkedinUrl" as const)
        : ("name" as const);
    return toDuplicate(p, reason);
  });
}

export async function intakeRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  // owner 作用域取条目：不存在或非本人一律当作不存在。
  async function ownedItem(
    request: FastifyRequest,
    id: string,
  ): Promise<IntakeItemRow> {
    const item = await intakeRepo.findById(id);
    if (!item || item.ownerId !== request.user.sub) {
      throw new NotFoundError("采集条目不存在");
    }
    return item;
  }

  // ── 捕获投递（token 鉴权，不走 JWT）──────────────────────────────────
  // 采集脚本跑在第三方页面里，用长效 x-intake-token 投递原文。
  r.post(
    "/intake",
    {
      schema: {
        tags: ["intake"],
        summary: "投递采集到的原文（x-intake-token 鉴权）",
        body: captureBodySchema,
        response: { 201: captureResponseSchema },
      },
    },
    async (request, reply) => {
      const raw = request.headers["x-intake-token"];
      const token = Array.isArray(raw) ? raw[0] : raw;
      if (!token || !token.trim()) {
        throw new UnauthorizedError("缺少采集令牌");
      }
      const owner = await usersRepo.findByIntakeToken(token.trim());
      if (!owner || !owner.enabled) {
        throw new UnauthorizedError("采集令牌无效");
      }
      const b = request.body;
      const item = await intakeRepo.create({
        ownerId: owner.id,
        source: b.source,
        sourceUrl: b.sourceUrl ?? null,
        rawContent: b.rawContent,
        rawFormat: b.rawFormat,
      });
      reply.code(201);
      return { id: item.id };
    },
  );

  // ── 收件箱（owner 作用域）────────────────────────────────────────────
  r.get(
    "/intake",
    {
      ...auth,
      schema: {
        tags: ["intake"],
        summary: "我的采集条目列表",
        security: [{ bearerAuth: [] }],
        querystring: listIntakeQuerySchema,
        response: { 200: listIntakeResponseSchema },
      },
    },
    async (request) => {
      const { status, page, pageSize } = request.query;
      const { items, total } = await intakeRepo.list({
        ownerId: request.user.sub,
        status,
        page,
        pageSize,
      });
      return { items: items.map(toIntakeItem), total };
    },
  );

  r.get(
    "/intake/:id",
    {
      ...auth,
      schema: {
        tags: ["intake"],
        summary: "采集条目详情（含查重候选）",
        security: [{ bearerAuth: [] }],
        params: intakeIdParamSchema,
        response: { 200: intakeDetailResponseSchema },
      },
    },
    async (request) => {
      const item = await ownedItem(request, request.params.id);
      const duplicates = await computeDuplicates(parseDraftText(item.parsedDraft));
      return { item: toIntakeItem(item), duplicates };
    },
  );

  // 解析：调默认端点把原文抽成 Person 草稿；失败则存 parseError 供人排查。
  r.post(
    "/intake/:id/parse",
    {
      ...auth,
      schema: {
        tags: ["intake"],
        summary: "AI 解析原文为 Person 草稿",
        security: [{ bearerAuth: [] }],
        params: intakeIdParamSchema,
        response: { 200: intakeDetailResponseSchema },
      },
    },
    async (request) => {
      const item = await ownedItem(request, request.params.id);
      if (item.status === "imported" || item.status === "discarded") {
        throw new AppError("该条目已处理，无法再次解析", 409);
      }
      const provider = await aiProvidersRepo.findActive();
      if (!provider) {
        throw new AppError("未配置可用的模型端点，请先在系统管理页添加", 400);
      }
      try {
        const draft = await parsePersonFromRaw(
          {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
            params: provider.params,
          },
          item.rawContent,
          item.sourceUrl,
        );
        const updated = await intakeRepo.update(item.id, {
          status: "parsed",
          parsedDraft: JSON.stringify(draft),
          parseError: null,
        });
        const duplicates = await computeDuplicates(draft);
        return { item: toIntakeItem(updated!), duplicates };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const updated = await intakeRepo.update(item.id, {
          parseError: message,
        });
        return { item: toIntakeItem(updated!), duplicates: [] };
      }
    },
  );

  // 入库：用（可编辑后的）草稿走现有 Person 创建逻辑，回填 personId。
  r.post(
    "/intake/:id/import",
    {
      ...auth,
      schema: {
        tags: ["intake"],
        summary: "确认入库：从草稿创建 Person",
        security: [{ bearerAuth: [] }],
        params: intakeIdParamSchema,
        body: createPersonBodySchema,
        response: { 201: importResponseSchema },
      },
    },
    async (request, reply) => {
      const item = await ownedItem(request, request.params.id);
      if (item.status === "imported") {
        throw new AppError("该条目已入库", 409);
      }
      const personId = await personsRepo.create(request.body, request.user.sub);
      await intakeRepo.update(item.id, { status: "imported", personId });
      reply.code(201);
      return { personId };
    },
  );

  r.post(
    "/intake/:id/discard",
    {
      ...auth,
      schema: {
        tags: ["intake"],
        summary: "丢弃采集条目",
        security: [{ bearerAuth: [] }],
        params: intakeIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const item = await ownedItem(request, request.params.id);
      await intakeRepo.update(item.id, { status: "discarded" });
      return { ok: true };
    },
  );
}
