import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";

// 注册 JWT 并暴露 authenticate 装饰器（fp 确保其全局可见）。
export default fp(async (app) => {
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
  });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ message: "未授权或登录已过期" });
      }
    },
  );
});
