import { request } from "../request";

export interface Health {
  status: string;
  timestamp: string;
}

// 系统域接口。业务组件通过 react-query 调用这些方法。
export const systemService = {
  health: () => request.get<Health>("/health"),
};
