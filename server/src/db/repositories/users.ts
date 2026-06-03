import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, ne } from "drizzle-orm";
import { db } from "../index";
import { users, type NewUserRow, type UserRole, type UserRow } from "../schema";

// 用户数据访问层：封装 Drizzle 操作，业务规则在 service/routes 层处理。

export interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export const usersRepo = {
  async list({ page, pageSize, keyword }: ListParams) {
    const where = keyword
      ? like(users.username, `%${keyword}%`)
      : undefined;

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(users).where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  },

  findById(id: string): Promise<UserRow | undefined> {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },

  findByUsername(username: string): Promise<UserRow | undefined> {
    return db.query.users.findFirst({ where: eq(users.username, username) });
  },

  async create(
    data: Omit<NewUserRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserRow> {
    const now = new Date();
    const [row] = await db
      .insert(users)
      .values({ ...data, id: randomUUID(), createdAt: now, updatedAt: now })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: Partial<Pick<UserRow, "displayName" | "email" | "role" | "enabled" | "passwordHash">>,
  ): Promise<UserRow | undefined> {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  },

  async remove(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },

  // 统计管理员数量（用于护栏：禁止删除/降级最后一个管理员）。
  async countAdmins(excludeId?: string): Promise<number> {
    const where = excludeId
      ? and(eq(users.role, "admin"), ne(users.id, excludeId))
      : eq(users.role, "admin");
    const rows = await db.select({ value: count() }).from(users).where(where);
    return rows[0]?.value ?? 0;
  },

  async total(): Promise<number> {
    const rows = await db.select({ value: count() }).from(users);
    return rows[0]?.value ?? 0;
  },
};

export type { UserRow, UserRole };
