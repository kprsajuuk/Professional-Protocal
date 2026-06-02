import { z } from "zod";

export const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({ id: z.string(), username: z.string() }),
});

export const meResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
});
