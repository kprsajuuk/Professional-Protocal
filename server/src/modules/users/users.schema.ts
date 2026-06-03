import { z } from "zod";
import type { UserRow } from "../../db/schema";

// 对外暴露的用户表示（绝不含密码哈希）。auth 与 users 模块共用。
export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: z.enum(["admin", "user"]),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const passwordSchema = z.string().min(4, "密码至少 4 位");

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional(),
});

export const listUsersResponseSchema = z.object({
  items: z.array(publicUserSchema),
  total: z.number(),
});

export const createUserBodySchema = z.object({
  username: z.string().trim().min(1, "用户名不能为空"),
  displayName: z.string().trim().default(""),
  email: z.string().email("邮箱格式不正确").nullable().optional(),
  role: z.enum(["admin", "user"]).default("user"),
  password: passwordSchema,
});

export const updateUserBodySchema = z.object({
  displayName: z.string().trim().optional(),
  email: z.string().email("邮箱格式不正确").nullable().optional(),
  role: z.enum(["admin", "user"]).optional(),
  enabled: z.boolean().optional(),
});

export const resetPasswordBodySchema = z.object({
  newPassword: passwordSchema,
});

export const userIdParamSchema = z.object({ id: z.string() });

export const okResponseSchema = z.object({ ok: z.boolean() });
