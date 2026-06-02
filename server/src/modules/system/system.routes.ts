import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthResponseSchema } from "./system.schema";

export async function systemRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "健康检查",
        description: "返回服务运行状态，用于探活与联调验证。",
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: "ok" as const, timestamp: new Date().toISOString() }),
  );
}
