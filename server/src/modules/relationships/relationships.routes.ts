import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError } from "../../lib/errors";
import { relationshipsRepo } from "../../db/repositories/relationships";
import { personsRepo } from "../../db/repositories/persons";
import {
  toEducationExperience,
  toPerson,
  toWorkExperience,
} from "../persons/persons.schema";
import {
  createRelationshipBodySchema,
  listRelationshipsQuerySchema,
  listRelationshipsResponseSchema,
  okResponseSchema,
  relationshipDetailSchema,
  relationshipIdParamSchema,
  toRelationship,
  updateRelationshipBodySchema,
} from "./relationships.schema";

// 关系：账号私有。所有端点仅作用于当前用户自己的关系（owner 作用域）。
export async function relationshipsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  // 取自己的关系，否则按 404 处理（不泄露他人关系存在性）。
  async function getOwned(id: string, ownerId: string) {
    const rel = await relationshipsRepo.findById(id);
    if (!rel || rel.ownerId !== ownerId) throw new NotFoundError("关系不存在");
    return rel;
  }

  r.get(
    "/relationships",
    {
      ...auth,
      schema: {
        tags: ["relationships"],
        summary: "我的关系列表（阶段/状态/关键字过滤 + 分页）",
        security: [{ bearerAuth: [] }],
        querystring: listRelationshipsQuerySchema,
        response: { 200: listRelationshipsResponseSchema },
      },
    },
    async (request) => {
      const { page, pageSize, keyword, stage, status } = request.query;
      const { items, total } = await relationshipsRepo.list({
        ownerId: request.user.sub,
        page,
        pageSize,
        keyword,
        stage,
        status,
      });
      return {
        items: items.map((row) => ({
          ...toRelationship(row.relationship),
          person: row.person,
        })),
        total,
      };
    },
  );

  r.get(
    "/relationships/:id",
    {
      ...auth,
      schema: {
        tags: ["relationships"],
        summary: "关系详情（含人物完整资料）",
        security: [{ bearerAuth: [] }],
        params: relationshipIdParamSchema,
        response: { 200: relationshipDetailSchema },
      },
    },
    async (request) => {
      const rel = await getOwned(request.params.id, request.user.sub);
      const detail = await personsRepo.getDetail(rel.personId);
      if (!detail) throw new NotFoundError("关联人物不存在");
      return {
        ...toRelationship(rel),
        person: {
          ...toPerson(detail.person),
          workExperiences: detail.work.map(toWorkExperience),
          educationExperiences: detail.edu.map(toEducationExperience),
        },
      };
    },
  );

  r.post(
    "/relationships",
    {
      ...auth,
      schema: {
        tags: ["relationships"],
        summary: "建立关系（挂已有人物或同时新建人物）",
        security: [{ bearerAuth: [] }],
        body: createRelationshipBodySchema,
        response: { 201: relationshipDetailSchema },
      },
    },
    async (request, reply) => {
      const ownerId = request.user.sub;
      const { personId: linkId, person, ...fields } = request.body;

      let personId = linkId;
      if (person) {
        personId = personsRepo.create(person, ownerId);
      } else {
        const exists = await personsRepo.findById(personId!);
        if (!exists) throw new NotFoundError("人物不存在");
        if (await relationshipsRepo.findByOwnerAndPerson(ownerId, personId!)) {
          throw new AppError("你已与该人物建立关系", 409);
        }
      }

      const id = await relationshipsRepo.create(ownerId, personId!, fields);
      const rel = await relationshipsRepo.findById(id);
      const detail = await personsRepo.getDetail(personId!);
      reply.code(201);
      return {
        ...toRelationship(rel!),
        person: {
          ...toPerson(detail!.person),
          workExperiences: detail!.work.map(toWorkExperience),
          educationExperiences: detail!.edu.map(toEducationExperience),
        },
      };
    },
  );

  r.patch(
    "/relationships/:id",
    {
      ...auth,
      schema: {
        tags: ["relationships"],
        summary: "更新关系（阶段/信任/价值/理解/备注等）",
        security: [{ bearerAuth: [] }],
        params: relationshipIdParamSchema,
        body: updateRelationshipBodySchema,
        response: { 200: relationshipDetailSchema },
      },
    },
    async (request) => {
      const rel = await getOwned(request.params.id, request.user.sub);
      await relationshipsRepo.update(rel.id, request.body);
      const updated = await relationshipsRepo.findById(rel.id);
      const detail = await personsRepo.getDetail(rel.personId);
      return {
        ...toRelationship(updated!),
        person: {
          ...toPerson(detail!.person),
          workExperiences: detail!.work.map(toWorkExperience),
          educationExperiences: detail!.edu.map(toEducationExperience),
        },
      };
    },
  );

  r.delete(
    "/relationships/:id",
    {
      ...auth,
      schema: {
        tags: ["relationships"],
        summary: "删除关系（不影响共享的人物资料）",
        security: [{ bearerAuth: [] }],
        params: relationshipIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const rel = await getOwned(request.params.id, request.user.sub);
      await relationshipsRepo.remove(rel.id);
      return { ok: true };
    },
  );
}
