import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError } from "../../lib/errors";
import { personsRepo, type PersonDetail } from "../../db/repositories/persons";
import {
  createPersonBodySchema,
  listPersonsQuerySchema,
  listPersonsResponseSchema,
  okResponseSchema,
  personDetailSchema,
  personIdParamSchema,
  toEducationExperience,
  toPerson,
  toWorkExperience,
  updatePersonBodySchema,
} from "./persons.schema";

function detailDto(detail: PersonDetail) {
  return {
    ...toPerson(detail.person),
    workExperiences: detail.work.map(toWorkExperience),
    educationExperiences: detail.edu.map(toEducationExperience),
  };
}

// 人物库：客观资料，所有登录账号共享可见可建/可改（见 Memory/Domain.md）。
export async function personsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  r.get(
    "/persons",
    {
      ...auth,
      schema: {
        tags: ["persons"],
        summary: "人物列表（共享 / 搜索 + 分页）",
        security: [{ bearerAuth: [] }],
        querystring: listPersonsQuerySchema,
        response: { 200: listPersonsResponseSchema },
      },
    },
    async (request) => {
      const { items, total } = await personsRepo.list(request.query);
      return { items: items.map(toPerson), total };
    },
  );

  r.get(
    "/persons/:id",
    {
      ...auth,
      schema: {
        tags: ["persons"],
        summary: "人物详情（含工作 / 教育经历）",
        security: [{ bearerAuth: [] }],
        params: personIdParamSchema,
        response: { 200: personDetailSchema },
      },
    },
    async (request) => {
      const detail = await personsRepo.getDetail(request.params.id);
      if (!detail) throw new NotFoundError("人物不存在");
      return detailDto(detail);
    },
  );

  r.post(
    "/persons",
    {
      ...auth,
      schema: {
        tags: ["persons"],
        summary: "创建人物（含经历）",
        security: [{ bearerAuth: [] }],
        body: createPersonBodySchema,
        response: { 201: personDetailSchema },
      },
    },
    async (request, reply) => {
      const id = await personsRepo.create(request.body, request.user.sub);
      const detail = await personsRepo.getDetail(id);
      reply.code(201);
      return detailDto(detail!);
    },
  );

  r.patch(
    "/persons/:id",
    {
      ...auth,
      schema: {
        tags: ["persons"],
        summary: "更新人物（经历为替换式）",
        security: [{ bearerAuth: [] }],
        params: personIdParamSchema,
        body: updatePersonBodySchema,
        response: { 200: personDetailSchema },
      },
    },
    async (request) => {
      const existing = await personsRepo.findById(request.params.id);
      if (!existing) throw new NotFoundError("人物不存在");
      await personsRepo.update(request.params.id, request.body, request.user.sub);
      const detail = await personsRepo.getDetail(request.params.id);
      return detailDto(detail!);
    },
  );

  r.delete(
    "/persons/:id",
    {
      ...auth,
      schema: {
        tags: ["persons"],
        summary: "删除人物（仅创建者或管理员）",
        security: [{ bearerAuth: [] }],
        params: personIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const existing = await personsRepo.findById(request.params.id);
      if (!existing) throw new NotFoundError("人物不存在");
      const isOwnerOrAdmin =
        existing.createdBy === request.user.sub || request.user.role === "admin";
      if (!isOwnerOrAdmin) {
        throw new AppError("仅创建者或管理员可删除该人物", 403);
      }
      await personsRepo.remove(request.params.id);
      return { ok: true };
    },
  );
}
