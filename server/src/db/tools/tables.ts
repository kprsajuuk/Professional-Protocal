import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

export type Sqlite = InstanceType<typeof Database>;

// 列描述：导出时随数据一起落盘，作为导入器的「规格说明书」。
export interface ColumnDesc {
  name: string;
  type: string;
  notNull: boolean;
  default: string | null;
  pk: boolean;
}

// 外键拓扑顺序：插入按此序，删除反序。不在表内的未知表附到最后。
export const TABLE_ORDER = [
  "users",
  "companies",
  "schools",
  "persons",
  "work_experiences",
  "education_experiences",
  "relationships",
  "interactions",
  "ai_providers",
  "self_profiles",
];

export function orderTables(tables: string[]): string[] {
  const rank = (t: string) => {
    const i = TABLE_ORDER.indexOf(t);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...tables].sort((a, b) => rank(a) - rank(b));
}

// 业务表清单（排除 SQLite 内部表与 Drizzle 迁移记录表）。
export function listTables(sqlite: Sqlite): string[] {
  const rows = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
    )
    .all() as Array<{ name: string }>;
  return orderTables(rows.map((r) => r.name));
}

export function tableInfo(sqlite: Sqlite, table: string): ColumnDesc[] {
  const rows = sqlite.pragma(`table_info("${table}")`) as Array<{
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>;
  return rows.map((r) => ({
    name: r.name,
    type: r.type,
    notNull: r.notnull === 1,
    default: r.dflt_value,
    pk: r.pk > 0,
  }));
}

// 当前迁移版本戳：取 drizzle/meta/_journal.json 最后一条 tag。
export function readMigrationTag(): string | null {
  try {
    const journal = JSON.parse(
      readFileSync(resolve(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ tag: string }> };
    return journal.entries.at(-1)?.tag ?? null;
  } catch {
    return null;
  }
}
