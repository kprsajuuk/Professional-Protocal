import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  loginBodySchema,
  loginResponseSchema,
  meResponseSchema,
} from "./auth.schema";
import { verifyCredentials } from "./auth.service";

export async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "登录（stub 凭据，待接入真实用户表）",
        body: loginBodySchema,
        response: { 200: loginResponseSchema },
      },
    },
    async (request) => {
      const { username, password } = request.body;
      const user = verifyCredentials(username, password);
      const token = await app.jwt.sign({ sub: user.id, username: user.username });
      return { token, user };
    },
  );

  r.get(
    "/auth/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "获取当前登录用户（受保护示例）",
        security: [{ bearerAuth: [] }],
        response: { 200: meResponseSchema },
      },
    },
    async (request) => ({
      id: request.user.sub,
      username: request.user.username,
    }),
  );
}
