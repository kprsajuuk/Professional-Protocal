import axios from "axios";

// 所有请求走 /api 前缀，开发期由 Vite 代理到后端（见 vite.config.ts）。
export const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});
