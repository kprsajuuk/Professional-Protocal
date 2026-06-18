import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { config } from "../../config";
import {
  listTables,
  readMigrationTag,
  tableInfo,
  type ColumnDesc,
} from "./tables";

// 备份落盘目录：与 CLI（db:export）共用同一处，导入器（db:import）也读这里。
// 锚定 process.cwd()/backups —— 服务进程与 CLI 都从 server/ 启动，落点一致。
export function backupsDir(): string {
  return resolve(process.cwd(), "backups");
}

export interface BackupSummary {
  file: string; // 备份文件绝对路径
  fileName: string; // 文件名（dump-<stamp>.json）
  exportedAt: string;
  migrationTag: string | null;
  sizeBytes: number;
  tables: Array<{ name: string; rows: number }>;
}

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string; // 文件 mtime（ISO）
}

// 自描述备份：一份 JSON = meta(迁移版本戳) + schema(列描述) + data(各表原始行)。
// 走原始 better-sqlite3 只读连接，值原样进出（不经 Drizzle 类型映射）。
export function createBackup(): BackupSummary {
  const sqlite = new Database(config.databaseUrl, { readonly: true });
  try {
    const tables = listTables(sqlite);
    const schema: Record<string, ColumnDesc[]> = {};
    const data: Record<string, unknown[]> = {};
    for (const t of tables) {
      schema[t] = tableInfo(sqlite, t);
      data[t] = sqlite.prepare(`SELECT * FROM "${t}"`).all();
    }

    const exportedAt = new Date().toISOString();
    const dump = {
      meta: { exportedAt, migrationTag: readMigrationTag(), tables },
      schema,
      data,
    };

    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const stamp = exportedAt.replace(/[:.]/g, "-");
    const fileName = `dump-${stamp}.json`;
    const file = join(dir, fileName);
    const json = JSON.stringify(dump, null, 2);
    writeFileSync(file, json, "utf8");

    return {
      file,
      fileName,
      exportedAt,
      migrationTag: dump.meta.migrationTag,
      sizeBytes: Buffer.byteLength(json, "utf8"),
      tables: tables.map((name) => ({ name, rows: data[name].length })),
    };
  } finally {
    sqlite.close();
  }
}

// 已有备份文件清单（按时间倒序）。目录不存在时返回空数组。
export function listBackupFiles(): BackupFileInfo[] {
  const dir = backupsDir();
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((f) => f.startsWith("dump-") && f.endsWith(".json"))
    .map((fileName) => {
      const st = statSync(join(dir, fileName));
      return {
        fileName,
        sizeBytes: st.size,
        createdAt: st.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.fileName.localeCompare(a.fileName));
}
