import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});

// 备份结果：一次「立即备份」产出的文件元信息 + 各表行数。
export const backupSummarySchema = z.object({
  fileName: z.string(),
  file: z.string(),
  exportedAt: z.string(),
  migrationTag: z.string().nullable(),
  sizeBytes: z.number(),
  tables: z.array(z.object({ name: z.string(), rows: z.number() })),
});

// 备份目录下的历史文件清单（按时间倒序）。
export const backupListResponseSchema = z.object({
  dir: z.string(),
  items: z.array(
    z.object({
      fileName: z.string(),
      sizeBytes: z.number(),
      createdAt: z.string(),
    }),
  ),
});
