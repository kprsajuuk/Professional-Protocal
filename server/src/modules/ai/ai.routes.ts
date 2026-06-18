import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError } from "../../lib/errors";
import { aiProvidersRepo } from "../../db/repositories/aiProviders";
import { selfProfilesRepo } from "../../db/repositories/selfProfiles";
import { usersRepo } from "../../db/repositories/users";
import { personsRepo } from "../../db/repositories/persons";
import { relationshipsRepo } from "../../db/repositories/relationships";
import { interactionsRepo } from "../../db/repositories/interactions";
import {
  generateIcebreaker,
  listModels,
  type ProviderConfig,
} from "./ai.service";
import {
  createProviderBodySchema,
  icebreakerParamSchema,
  icebreakerResponseSchema,
  listProvidersResponseSchema,
  okResponseSchema,
  providerIdParamSchema,
  providerSchema,
  testProviderBodySchema,
  testProviderResponseSchema,
  toProvider,
  updateProviderBodySchema,
} from "./ai.schema";

// 空串归一为 null（清空），undefined 表示不改。
function normApiKey(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  return v && v.trim() ? v.trim() : null;
}

export async function aiRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };
  const adminGuard = { onRequest: [app.authenticate, app.authorizeAdmin] };

  // ── 模型端点管理（admin）───────────────────────────────────────────
  r.get(
    "/ai/providers",
    {
      ...adminGuard,
      schema: {
        tags: ["ai"],
        summary: "模型端点列表",
        security: [{ bearerAuth: [] }],
        response: { 200: listProvidersResponseSchema },
      },
    },
    async () => ({ items: (await aiProvidersRepo.list()).map(toProvider) }),
  );

  r.post(
    "/ai/providers",
    {
      ...adminGuard,
      schema: {
        tags: ["ai"],
        summary: "新增模型端点",
        security: [{ bearerAuth: [] }],
        body: createProviderBodySchema,
        response: { 201: providerSchema },
      },
    },
    async (request, reply) => {
      const b = request.body;
      const row = await aiProvidersRepo.create({
        name: b.name,
        kind: b.kind,
        baseUrl: b.baseUrl,
        apiKey: normApiKey(b.apiKey) ?? null,
        model: b.model,
        params: b.params ?? null,
        enabled: b.enabled,
        isDefault: b.isDefault,
        createdBy: request.user.sub,
      });
      reply.code(201);
      return toProvider(row);
    },
  );

  r.patch(
    "/ai/providers/:id",
    {
      ...adminGuard,
      schema: {
        tags: ["ai"],
        summary: "更新模型端点（apiKey 省略=不变，空串=清空）",
        security: [{ bearerAuth: [] }],
        params: providerIdParamSchema,
        body: updateProviderBodySchema,
        response: { 200: providerSchema },
      },
    },
    async (request) => {
      const existing = await aiProvidersRepo.findById(request.params.id);
      if (!existing) throw new NotFoundError("模型端点不存在");
      const b = request.body;
      const apiKey = normApiKey(b.apiKey);
      const updated = await aiProvidersRepo.update(request.params.id, {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.kind !== undefined && { kind: b.kind }),
        ...(b.baseUrl !== undefined && { baseUrl: b.baseUrl }),
        ...(apiKey !== undefined && { apiKey }),
        ...(b.model !== undefined && { model: b.model }),
        ...(b.params !== undefined && { params: b.params ?? null }),
        ...(b.enabled !== undefined && { enabled: b.enabled }),
        ...(b.isDefault !== undefined && { isDefault: b.isDefault }),
      });
      return toProvider(updated!);
    },
  );

  r.delete(
    "/ai/providers/:id",
    {
      ...adminGuard,
      schema: {
        tags: ["ai"],
        summary: "删除模型端点",
        security: [{ bearerAuth: [] }],
        params: providerIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const existing = await aiProvidersRepo.findById(request.params.id);
      if (!existing) throw new NotFoundError("模型端点不存在");
      await aiProvidersRepo.remove(request.params.id);
      return { ok: true };
    },
  );

  r.post(
    "/ai/providers/test",
    {
      ...adminGuard,
      schema: {
        tags: ["ai"],
        summary: "测试连接（按已存 id 或内联配置探活）",
        security: [{ bearerAuth: [] }],
        body: testProviderBodySchema,
        response: { 200: testProviderResponseSchema },
      },
    },
    async (request) => {
      const { id, baseUrl, apiKey, model } = request.body;
      let config: ProviderConfig;
      if (id) {
        const row = await aiProvidersRepo.findById(id);
        if (!row) throw new NotFoundError("模型端点不存在");
        config = {
          baseUrl: baseUrl ?? row.baseUrl,
          apiKey: apiKey !== undefined ? normApiKey(apiKey) : row.apiKey,
          model: model ?? row.model,
        };
      } else {
        if (!baseUrl) throw new AppError("缺少 baseUrl", 400);
        config = { baseUrl, apiKey: normApiKey(apiKey), model: model ?? "" };
      }
      const models = await listModels(config);
      return { ok: true, models };
    },
  );

  // ── 破冰建议（owner 作用域，不落库）──────────────────────────────────
  r.post(
    "/ai/relationships/:id/icebreaker",
    {
      ...auth,
      schema: {
        tags: ["ai"],
        summary: "为某段关系生成破冰建议与首条消息草稿（不落库）",
        security: [{ bearerAuth: [] }],
        params: icebreakerParamSchema,
        response: { 200: icebreakerResponseSchema },
      },
    },
    async (request) => {
      const ownerId = request.user.sub;
      const rel = await relationshipsRepo.findById(request.params.id);
      if (!rel || rel.ownerId !== ownerId) throw new NotFoundError("关系不存在");

      const provider = await aiProvidersRepo.findActive();
      if (!provider) {
        throw new AppError("未配置可用的模型端点，请先在系统管理页添加", 400);
      }

      const target = await personsRepo.getDetail(rel.personId);
      if (!target) throw new NotFoundError("关联人物不存在");

      const me = await usersRepo.findById(ownerId);
      const myDetail = me?.personId
        ? ((await personsRepo.getDetail(me.personId)) ?? null)
        : null;
      const myPreferences = (await selfProfilesRepo.findByUser(ownerId)) ?? null;
      const interactions = await interactionsRepo.listByRelationship(rel.id);

      const result = await generateIcebreaker(
        {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model,
          params: provider.params,
        },
        { me: myDetail, myPreferences, target, relationship: rel, interactions },
      );

      return {
        ...result,
        provider: { id: provider.id, name: provider.name, model: provider.model },
      };
    },
  );
}
