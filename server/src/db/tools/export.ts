import { createBackup } from "./backup";

// CLI 入口（npm run db:export）：调用共享的备份核心，把结果打印到终端。
// 前端「系统管理 → 立即备份」走的是同一份 createBackup()。
function main(): void {
  const summary = createBackup();
  console.log(`已导出 → ${summary.file}`);
  console.log(`迁移版本：${summary.migrationTag ?? "(未知)"}`);
  for (const t of summary.tables) {
    console.log(`  ${t.name}: ${t.rows} 行`);
  }
}

main();
