import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "../config";
import { hashPassword } from "../lib/password";
import { db } from "./index";
import { usersRepo } from "./repositories/users";

// 迁移文件夹（drizzle.config.ts 的 out=./drizzle）。
// 后端始终从 server/ 目录启动（见 DEV_NOTES.md），故相对 cwd 解析。
const migrationsFolder = resolve(process.cwd(), "drizzle");

// 启动时初始化数据库：自动应用迁移 + 首次播种内置管理员，保证开箱即用。
export async function bootstrapDatabase(
  log: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<void> {
  if (!existsSync(migrationsFolder)) {
    // 迁移缺失 = 建不了表，继续下去只会在查询时莫名崩溃。直接中止并给出明确指引。
    throw new Error(
      `未找到迁移目录 ${migrationsFolder}。请确认在 server/ 目录下启动；` +
        `若迁移确实缺失，运行 npm run db:generate 生成。`,
    );
  }
  migrate(db, { migrationsFolder });
  log.info("数据库迁移已应用");

  if ((await usersRepo.total()) === 0) {
    await usersRepo.create({
      username: config.seedAdmin.username,
      displayName: "管理员",
      role: "admin",
      enabled: true,
      passwordHash: await hashPassword(config.seedAdmin.password),
    });
    log.info(`已播种初始管理员：${config.seedAdmin.username}`);
  }
}
