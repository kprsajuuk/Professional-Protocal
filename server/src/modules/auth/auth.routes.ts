import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { NotFoundError } from "../../lib/errors";
import { usersRepo } from "../../db/repositories/users";
import { toPublicUser } from "../users/users.schema";
import {
  changePasswordBodySchema,
  loginBodySchema,
  loginResponseSchema,
  meResponseSchema,
  okResponseSchema,
} from "./auth.schema";
import { changeOwnPassword, verifyCredentials } from "./auth.service";

export async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "登录（查库 + 密码哈希校验）",
        body: loginBodySchema,
        response: { 200: loginResponseSchema },
      },
    },
    async (request) => {
      const { username, password } = request.body;
      const user = await verifyCredentials(username, password);
      const token = await app.jwt.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
      return { token, user: toPublicUser(user) };
    },
  );

  r.get(
    "/auth/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "获取当前登录用户",
        security: [{ bearerAuth: [] }],
        response: { 200: meResponseSchema },
      },
    },
    async (request) => {
      const user = await usersRepo.findById(request.user.sub);
      if (!user) throw new NotFoundError("用户不存在");
      return toPublicUser(user);
    },
  );

  r.post(
    "/auth/password",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "修改当前用户密码",
        security: [{ bearerAuth: [] }],
        body: changePasswordBodySchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const { oldPassword, newPassword } = request.body;
      await changeOwnPassword(request.user.sub, oldPassword, newPassword);
      return { ok: true };
    },
  );
}
