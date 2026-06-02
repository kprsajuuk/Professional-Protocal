import { config } from "../../config";
import { UnauthorizedError } from "../../lib/errors";

// stub：校验占位凭据。真实用户表接入后，替换为查库 + 密码哈希校验。
export function verifyCredentials(username: string, password: string) {
  if (username !== config.auth.username || password !== config.auth.password) {
    throw new UnauthorizedError("用户名或密码错误");
  }
  return { id: "local-admin", username };
}
