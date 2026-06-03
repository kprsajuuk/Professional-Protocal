import { AppError, UnauthorizedError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import { usersRepo } from "../../db/repositories/users";
import type { UserRow } from "../../db/schema";

// 校验登录凭据：查库 + 密码哈希比对 + 停用拦截。返回完整用户行。
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<UserRow> {
  const user = await usersRepo.findByUsername(username);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError("用户名或密码错误");
  }
  if (!user.enabled) {
    throw new UnauthorizedError("账号已被停用，请联系管理员");
  }
  return user;
}

// 自助修改密码：校验旧密码后写入新密码。
export async function changeOwnPassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await usersRepo.findById(userId);
  if (!user) {
    throw new UnauthorizedError("用户不存在");
  }
  if (!(await verifyPassword(oldPassword, user.passwordHash))) {
    throw new AppError("原密码不正确", 400);
  }
  await usersRepo.update(userId, {
    passwordHash: await hashPassword(newPassword),
  });
}
