// 集中读取 import.meta.env，避免在各处散落 import.meta.env.* 访问。
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
};
