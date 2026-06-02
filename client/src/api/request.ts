import type { AxiosRequestConfig } from "axios";
import { http } from "./http";

// 泛型请求封装：成功时直接解包返回数据（标准 REST，无信封）。
// 业务层（api/services/*）基于它定义具体接口。
export const request = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    http.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, data, config).then((r) => r.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, data, config).then((r) => r.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    http.patch<T>(url, data, config).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    http.delete<T>(url, config).then((r) => r.data),
};
