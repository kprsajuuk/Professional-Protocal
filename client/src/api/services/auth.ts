import { request } from "../request";
import type { User } from "./users";

export interface LoginPayload {
  username: string;
  password: string;
}

// 当前登录用户即完整用户表示。
export type AuthUser = User;

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

// 鉴权域接口。
export const authService = {
  login: (payload: LoginPayload) =>
    request.post<LoginResult>("/auth/login", payload),
  me: () => request.get<AuthUser>("/auth/me"),
  changePassword: (payload: ChangePasswordPayload) =>
    request.post<{ ok: boolean }>("/auth/password", payload),
};
