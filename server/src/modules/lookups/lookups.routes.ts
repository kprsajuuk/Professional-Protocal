import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { companiesRepo, schoolsRepo } from "../../db/repositories/lookups";

const querySchema = z.object({
  keyword: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const responseSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
});

// 公司 / 学校查找:供前端 AutoComplete 搜索已有项(新建在 person 提交时 find-or-create)。
export async function lookupsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  r.get(
    "/companies",
    {
      ...auth,
      schema: {
        tags: ["lookups"],
        summary: "搜索公司",
        security: [{ bearerAuth: [] }],
        querystring: querySchema,
        response: { 200: responseSchema },
      },
    },
    async (request) => ({
      items: await companiesRepo.search(request.query.keyword, request.query.limit),
    }),
  );

  r.get(
    "/schools",
    {
      ...auth,
      schema: {
        tags: ["lookups"],
        summary: "搜索学校",
        security: [{ bearerAuth: [] }],
        querystring: querySchema,
        response: { 200: responseSchema },
      },
    },
    async (request) => ({
      items: await schoolsRepo.search(request.query.keyword, request.query.limit),
    }),
  );
}
