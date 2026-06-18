import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { config } from "../../config";
import { listTables, orderTables, tableInfo, type ColumnDesc } from "./tables";

// ── 破坏性变更时在这里补「按表的自定义转换」───────────────────────────
// 拿旧行产出新行对象（键 = 新列名）；返回 null 表示丢弃该行。
// 未登记的表走默认：只搬「列名对得上」的字段。
// dry-run 会按「旧描述 vs 新 schema」的差异，自动打印可粘贴的骨架。
type Transform = (oldRow: Record<string, unknown>) => Record<string, unknown> | null;
const transforms: Record<string, Transform> = {
  // 例：work_experiences 旧的 company(文本) → 新的 company_id(外键) 这类语义转换，
  // 需要查 companies 表，换库时按 dry-run 报告在此补一段即可。
};
// ──────────────────────────────────────────────────────────────────

interface Dump {
  meta: { exportedAt: string; migrationTag: string | null; tables: string[] };
  schema: Record<string, ColumnDesc[]>;
  data: Record<string, Record<string, unknown>[]>;
}

function resolveDumpPath(arg: string | undefined): string {
  if (arg) return resolve(process.cwd(), arg);
  const dir = resolve(process.cwd(), "backups");
  if (!existsSync(dir)) {
    throw new Error("未找到 backups/，请先 npm run db:export，或显式指定 dump 文件路径");
  }
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("dump-") && f.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    throw new Error("backups/ 下没有 dump 文件，请显式指定 dump 文件路径");
  }
  return join(dir, files[files.length - 1]);
}

function pick(row: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) if (c in row) out[c] = row[c];
  return out;
}

function jsKey(c: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(c) ? c : JSON.stringify(c);
}

// 根据 matched / missing 列，生成可直接粘进 transforms 的骨架。
function skeleton(table: string, matched: string[], missing: string[]): string {
  return [
    `      ${JSON.stringify(table)}: (r) => ({`,
    ...matched.map((c) => `        ${jsKey(c)}: r[${JSON.stringify(c)}],`),
    ...missing.map(
      (c) =>
        `        // TODO 旧列 ${JSON.stringify(c)} 新库已无：映射到新列(改名) 或语义转换`,
    ),
    `      }),`,
  ].join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const pathArg = args.find((a) => !a.startsWith("--"));
  const dumpPath = resolveDumpPath(pathArg);
  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as Dump;

  const sqlite = new Database(config.databaseUrl);
  try {
    const currentTables = new Set(listTables(sqlite));

    console.log(`Dump 文件：${dumpPath}`);
    console.log(`Dump 迁移版本：${dump.meta.migrationTag ?? "(未知)"}`);
    console.log(
      `模式：${apply ? "APPLY（将清空目标表后写入）" : "DRY-RUN（仅报告，不写库）"}`,
    );
    console.log("");

    const dumpTables = orderTables(Object.keys(dump.data));
    const plan: Array<{ table: string; cols: string[]; rows: Record<string, unknown>[] }> = [];

    for (const t of dumpTables) {
      const rows = dump.data[t] ?? [];
      if (!currentTables.has(t)) {
        console.log(`表 ${t}: 新库已无此表 → 跳过（${rows.length} 行不导入）`);
        continue;
      }
      const currentCols = tableInfo(sqlite, t).map((c) => c.name);
      const dumpCols = (dump.schema[t] ?? []).map((c) => c.name);
      const matched = dumpCols.filter((c) => currentCols.includes(c));
      const missingInNew = dumpCols.filter((c) => !currentCols.includes(c));
      const addedInNew = currentCols.filter((c) => !dumpCols.includes(c));
      const hasTransform = Boolean(transforms[t]);

      console.log(
        `表 ${t}: ${rows.length} 行 | 自动映射 ${matched.length} 列 | 新增 ${addedInNew.length} 列 | 旧列丢失 ${missingInNew.length} 列${hasTransform ? " | 已登记 transform" : ""}`,
      );
      if (addedInNew.length) {
        console.log(`    新增列（留默认/NULL）：${addedInNew.join(", ")}`);
      }
      if (missingInNew.length && !hasTransform) {
        console.log(`    需处理的旧列：${missingInNew.join(", ")}`);
        console.log(`    可在 import.ts 的 transforms 里补（骨架）：`);
        console.log(skeleton(t, matched, missingInNew));
      }
      plan.push({ table: t, cols: matched, rows });
    }

    if (!apply) {
      console.log("\nDRY-RUN 结束。确认无误后加 --apply 真正写入（会先清空目标表）。");
      return;
    }

    // APPLY：整体事务。先反 FK 序清空目标表，再正序写入。
    const tablesToWrite = plan.map((p) => p.table);
    const run = sqlite.transaction(() => {
      for (const t of [...tablesToWrite].reverse()) {
        sqlite.prepare(`DELETE FROM "${t}"`).run();
      }
      for (const p of plan) {
        const tf = transforms[p.table];
        let inserted = 0;
        for (const oldRow of p.rows) {
          const newRow = tf ? tf(oldRow) : pick(oldRow, p.cols);
          if (!newRow) continue;
          const cols = Object.keys(newRow);
          if (cols.length === 0) continue;
          const sql = `INSERT INTO "${p.table}" (${cols
            .map((c) => `"${c}"`)
            .join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
          const values = cols.map((c) => newRow[c]);
          sqlite.prepare(sql).run(...values);
          inserted++;
        }
        console.log(`  写入 ${p.table}: ${inserted} 行`);
      }
    });
    run();
    console.log("\n导入完成。");
  } finally {
    sqlite.close();
  }
}

main();
