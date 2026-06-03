import "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";

// JWT 载荷与解析后挂到 request.user 的类型。
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username: string; role: "admin" | "user" };
    user: { sub: string; username: string; role: "admin" | "user" };
  }
}

// 扩展实例：
// - authenticate：受保护路由的 onRequest 钩子（校验 token + 过期）。
// - authorizeAdmin：在 authenticate 之后使用，要求当前用户为管理员。
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorizeAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
