import { request } from "../request";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

// 鉴权域接口。
export const authService = {
  login: (payload: LoginPayload) =>
    request.post<LoginResult>("/auth/login", payload),
  me: () => request.get<AuthUser>("/auth/me"),
};
