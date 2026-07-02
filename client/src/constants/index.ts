export const APP_NAME = "Professional-Protocal";

// localStorage 键名（统一前缀，避免与其他应用冲突）
export const STORAGE_KEYS = {
  token: "pp.token",
  theme: "pp.theme",
} as const;

// 路由路径常量（避免在各处硬编码字符串）
export const ROUTES = {
  login: "/login",
  dashboard: "/",
  users: "/users",
  profile: "/profile",
  persons: "/persons",
  relationships: "/relationships",
  intake: "/intake",
  system: "/system",
} as const;
