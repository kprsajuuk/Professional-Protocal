import "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";

// JWT 载荷与解析后挂到 request.user 的类型。
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username: string };
    user: { sub: string; username: string };
  }
}

// 扩展实例：authenticate 作为受保护路由的 onRequest 钩子。
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
