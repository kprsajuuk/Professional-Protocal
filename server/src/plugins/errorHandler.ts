import fp from "fastify-plugin";
import { AppError } from "../lib/errors";

// 统一错误处理：把各类错误转换为标准错误体 { message, ... } + 合适的 HTTP 状态码，
// 与前端 axios 拦截器对齐（见 Memory/Conventions.md：标准 REST）。
export default fp(async (app) => {
  app.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, request, reply) => {
    // Zod / schema 校验错误（Fastify 在 error.validation 上挂载详情）
    if (error.validation) {
      reply.code(400).send({
        message: "请求参数校验失败",
        issues: error.validation,
      });
      return;
    }

    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ message: error.message });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
      reply.code(statusCode).send({ message: "服务器内部错误" });
      return;
    }

    reply.code(statusCode).send({ message: error.message });
  });
});
