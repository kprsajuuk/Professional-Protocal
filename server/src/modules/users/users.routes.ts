import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { usersRepo } from "../../db/repositories/users";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  listUsersResponseSchema,
  okResponseSchema,
  publicUserSchema,
  resetPasswordBodySchema,
  toPublicUser,
  updateUserBodySchema,
  userIdParamSchema,
} from "./users.schema";

// 用户管理：全部需要管理员权限（authenticate + authorizeAdmin）。
export async function usersRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminGuard = { onRequest: [app.authenticate, app.authorizeAdmin] };

  r.get(
    "/users",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "用户列表（分页 + 用户名搜索）",
        security: [{ bearerAuth: [] }],
        querystring: listUsersQuerySchema,
        response: { 200: listUsersResponseSchema },
      },
    },
    async (request) => {
      const { page, pageSize, keyword } = request.query;
      const { items, total } = await usersRepo.list({ page, pageSize, keyword });
      return { items: items.map(toPublicUser), total };
    },
  );

  r.get(
    "/users/:id",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "用户详情",
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        response: { 200: publicUserSchema },
      },
    },
    async (request) => {
      const user = await usersRepo.findById(request.params.id);
      if (!user) throw new NotFoundError("用户不存在");
      return toPublicUser(user);
    },
  );

  r.post(
    "/users",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "创建用户",
        security: [{ bearerAuth: [] }],
        body: createUserBodySchema,
        response: { 201: publicUserSchema },
      },
    },
    async (request, reply) => {
      const { username, displayName, email, role, password } = request.body;
      if (await usersRepo.findByUsername(username)) {
        throw new AppError("用户名已存在", 409);
      }
      const user = await usersRepo.create({
        username,
        displayName,
        email: email ?? null,
        role,
        enabled: true,
        passwordHash: await hashPassword(password),
      });
      reply.code(201);
      return toPublicUser(user);
    },
  );

  r.patch(
    "/users/:id",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "更新用户（显示名/邮箱/角色/启用状态）",
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        body: updateUserBodySchema,
        response: { 200: publicUserSchema },
      },
    },
    async (request) => {
      const { id } = request.params;
      const patch = request.body;
      const target = await usersRepo.findById(id);
      if (!target) throw new NotFoundError("用户不存在");

      const isSelf = id === request.user.sub;

      // 护栏：不能停用自己。
      if (isSelf && patch.enabled === false) {
        throw new AppError("不能停用自己的账号", 400);
      }

      // 护栏：不能降级/停用最后一个管理员。
      const demoting = target.role === "admin" && patch.role === "user";
      const disabling = target.role === "admin" && patch.enabled === false;
      if ((demoting || disabling) && (await usersRepo.countAdmins(id)) === 0) {
        throw new AppError("系统至少需要保留一个启用的管理员", 400);
      }

      const updated = await usersRepo.update(id, {
        ...(patch.displayName !== undefined && { displayName: patch.displayName }),
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.role !== undefined && { role: patch.role }),
        ...(patch.enabled !== undefined && { enabled: patch.enabled }),
      });
      return toPublicUser(updated!);
    },
  );

  r.delete(
    "/users/:id",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "删除用户",
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params;
      const target = await usersRepo.findById(id);
      if (!target) throw new NotFoundError("用户不存在");
      if (id === request.user.sub) {
        throw new AppError("不能删除自己的账号", 400);
      }
      if (target.role === "admin" && (await usersRepo.countAdmins(id)) === 0) {
        throw new AppError("系统至少需要保留一个管理员", 400);
      }
      await usersRepo.remove(id);
      return { ok: true };
    },
  );

  r.post(
    "/users/:id/reset-password",
    {
      ...adminGuard,
      schema: {
        tags: ["users"],
        summary: "重置用户密码",
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        body: resetPasswordBodySchema,
        response: { 200: okResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params;
      const target = await usersRepo.findById(id);
      if (!target) throw new NotFoundError("用户不存在");
      await usersRepo.update(id, {
        passwordHash: await hashPassword(request.body.newPassword),
      });
      return { ok: true };
    },
  );
}
