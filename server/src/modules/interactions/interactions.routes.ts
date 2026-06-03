import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { NotFoundError } from "../../lib/errors";
import { interactionsRepo } from "../../db/repositories/interactions";
import { relationshipsRepo } from "../../db/repositories/relationships";
import {
  createInteractionBodySchema,
  interactionIdParamSchema,
  interactionSchema,
  listInteractionsResponseSchema,
  okResponseSchema,
  relationshipIdParamSchema,
  toInteraction,
  updateInteractionBodySchema,
} from "./interactions.schema";

// 互动时间线：账号私有，挂在关系之下。owner 作用域。
export async function interactionsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  async function getOwnedRelationship(id: string, ownerId: string) {
    const rel = await relationshipsRepo.findById(id);
    if (!rel || rel.ownerId !== ownerId) throw new NotFoundError("关系不存在");
    return rel;
  }

  async function getOwnedInteraction(id: string, ownerId: string) {
    const it = await interactionsRepo.findById(id);
    if (!it || it.ownerId !== ownerId) throw new NotFoundError("互动记录不存在");
    return it;
  }

  r.get(
    "/relationships/:id/interactions",
    {
      ...auth,
      schema: {
        tags: ["interactions"],
        summary: "某关系的互动时间线（按发生时间倒序）",
        security: [{ bearerAuth: [] }],
        params: relationshipIdParamSchema,
        response: { 200: listInteractionsResponseSchema },
      },
    },
    async (request) => {
      await getOwnedRelationship(request.params.id, request.user.sub);
      const rows = await interactionsRepo.listByRelationship(request.params.id);
      return { items: rows.map(toInteraction) };
    },
  );

  r.post(
    "/relationships/:id/interactions",
    {
      ...auth,
      schema: {
        tags: ["interactions"],
        summary: "新增一条互动",
        security: [{ bearerAuth: [] }],
        params: relationshipIdParamSchema,
        body: createInteractionBodySchema,
        response: { 201: interactionSchema },
      },
    },
    async (request, reply) => {
      await getOwnedRelationship(request.params.id, request.user.sub);
      const row = await interactionsRepo.create(
        request.params.id,
        request.user.sub,
        request.body,
      );
      reply.code(201);
      return toInteraction(row);
    },
  );

  r.patch(
    "/interactions/:id",
    {
      ...auth,
      schema: {
        tags: ["interactions"],
        summary: "更新一条互动",
        security: [{ bearerAuth: [] }],
        params: interactionIdParamSchema,
        body: updateInteractionBodySchema,
        response: { 200: interactionSchema },
      },
    },
    async (request) => {
      const it = await getOwnedInteraction(request.params.id, request.user.sub);
      const updated = await interactionsRepo.update(it.id, request.body);
      return toInteraction(updated!);
    },
  );

  r.delete(
    "/interactions/:id",
    {
      ...auth,
      schema: {
        tags: ["interactions"],
        summary: "删除一条互动",
        security: [{ bearerAuth: [] }],
        params: interactionIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const it = await getOwnedInteraction(request.params.id, request.user.sub);
      await interactionsRepo.remove(it.id);
      return { ok: true };
    },
  );
}
