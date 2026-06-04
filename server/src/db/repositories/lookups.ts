import { randomUUID } from "node:crypto";
import { asc, like, sql } from "drizzle-orm";
import { db } from "../index";
import { companies, schools } from "../schema";

// 公司 / 学校都是「规范化的查找实体」：模糊搜索 + find-or-create(去空格、大小写不敏感去重)。
// 两者结构一致,用工厂生成各自的 repo,避免重复。
function makeLookupRepo(table: typeof companies | typeof schools) {
  return {
    async search(keyword: string | undefined, limit = 20) {
      const where = keyword
        ? like(sql`lower(${table.name})`, `%${keyword.trim().toLowerCase()}%`)
        : undefined;
      return db
        .select({ id: table.id, name: table.name })
        .from(table)
        .where(where)
        .orderBy(asc(table.name))
        .limit(limit);
    },

    async findOrCreate(rawName: string, userId: string): Promise<string> {
      const name = rawName.trim();
      const existing = await db
        .select({ id: table.id })
        .from(table)
        .where(sql`lower(${table.name}) = ${name.toLowerCase()}`)
        .limit(1);
      if (existing[0]) return existing[0].id;

      const id = randomUUID();
      const now = new Date();
      await db
        .insert(table)
        .values({ id, name, createdBy: userId, createdAt: now, updatedAt: now });
      return id;
    },
  };
}

export const companiesRepo = makeLookupRepo(companies);
export const schoolsRepo = makeLookupRepo(schools);
