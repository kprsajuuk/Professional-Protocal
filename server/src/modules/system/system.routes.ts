import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  backupsDir,
  createBackup,
  listBackupFiles,
} from "../../db/tools/backup";
import {
  backupListResponseSchema,
  backupSummarySchema,
  healthResponseSchema,
} from "./system.schema";

export async function systemRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminGuard = { onRequest: [app.authenticate, app.authorizeAdmin] };

  r.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "健康检查",
        description: "返回服务运行状态，用于探活与联调验证。",
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: "ok" as const, timestamp: new Date().toISOString() }),
  );

  // 数据备份：把整库导出为一份自描述 JSON，落在后端 backups/ 目录。仅管理员。
  r.post(
    "/system/backup",
    {
      ...adminGuard,
      schema: {
        tags: ["system"],
        summary: "立即备份（导出整库为自描述 JSON）",
        security: [{ bearerAuth: [] }],
        response: { 201: backupSummarySchema },
      },
    },
    async (_request, reply) => {
      const summary = createBackup();
      reply.code(201);
      return summary;
    },
  );

  // 历史备份清单：供系统管理页展示「有哪些备份、在哪」。仅管理员。
  r.get(
    "/system/backups",
    {
      ...adminGuard,
      schema: {
        tags: ["system"],
        summary: "备份文件清单（含落盘目录）",
        security: [{ bearerAuth: [] }],
        response: { 200: backupListResponseSchema },
      },
    },
    async () => ({ dir: backupsDir(), items: listBackupFiles() }),
  );
}
