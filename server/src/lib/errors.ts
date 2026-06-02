// 应用级错误：携带 HTTP 状态码，交由全局 errorHandler 统一转换为标准错误体。
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "未授权") {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(message, 404);
  }
}
