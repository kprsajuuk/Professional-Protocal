import { z } from "zod";
import { publicUserSchema } from "../users/users.schema";

export const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: publicUserSchema,
});

export const meResponseSchema = publicUserSchema;

export const changePasswordBodySchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(4, "密码至少 4 位"),
});

export const okResponseSchema = z.object({ ok: z.boolean() });
