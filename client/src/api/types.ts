// 与后端「标准 REST」契约对齐的通用类型。

// 失败响应的统一错误体（见后端 plugins/errorHandler.ts）。
export interface ApiError {
  message: string;
  issues?: unknown;
}

// 分页查询入参与列表返回的通用形态（业务列表端点复用）。
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}
