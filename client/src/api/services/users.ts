import { request } from "../request";
import type { PageResult } from "../types";

export type UserRole = "admin" | "user";

// 与后端 publicUser 对齐（见 server/src/modules/users/users.schema.ts）。
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface CreateUserPayload {
  username: string;
  displayName?: string;
  email?: string | null;
  role: UserRole;
  password: string;
}

export interface UpdateUserPayload {
  displayName?: string;
  email?: string | null;
  role?: UserRole;
  enabled?: boolean;
}

// 用户管理域接口（均需管理员权限）。
export const usersService = {
  list: (query: ListUsersQuery) =>
    request.get<PageResult<User>>("/users", { params: query }),
  get: (id: string) => request.get<User>(`/users/${id}`),
  create: (payload: CreateUserPayload) =>
    request.post<User>("/users", payload),
  update: (id: string, payload: UpdateUserPayload) =>
    request.patch<User>(`/users/${id}`, payload),
  remove: (id: string) => request.delete<{ ok: boolean }>(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    request.post<{ ok: boolean }>(`/users/${id}/reset-password`, { newPassword }),
};
