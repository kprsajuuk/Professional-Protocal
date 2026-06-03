import axios, { AxiosError } from "axios";
import { notification } from "antd";
import { env } from "../config/env";
import { storage } from "../lib/storage";
import { ROUTES, STORAGE_KEYS } from "../constants";
import type { ApiError } from "./types";

// 封装的 axios 实例：全应用唯一出口。拦截器在 React 之外工作，
// 因此直接读 storage / 操作 window，不依赖 React context（避免循环依赖）。
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
});

// 请求拦截器：注入 token
http.interceptors.request.use((config) => {
  const token = storage.get<string>(STORAGE_KEYS.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：成功放行；失败统一处理（401 跳登录，其余弹提示）
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = error.response?.data?.message ?? error.message ?? "请求失败";

    // 登录接口自身的 401（用户名/密码错误）不应被当作"会话过期"：
    // 不清除已有会话、不跳转，仅向上抛给登录页处理，避免误伤其他标签页的登录态。
    const isLoginRequest = (error.config?.url ?? "").includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      storage.remove(STORAGE_KEYS.token);
      if (window.location.pathname !== ROUTES.login) {
        const current = window.location.pathname + window.location.search;
        window.location.href = `${ROUTES.login}?redirect=${encodeURIComponent(current)}`;
      }
    } else if (isLoginRequest) {
      notification.error({
        message: "登录失败",
        description: message,
      });
    } else {
      notification.error({ message: "请求出错", description: message });
    }

    return Promise.reject(error);
  },
);
