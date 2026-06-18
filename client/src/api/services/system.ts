import { request } from "../request";

export interface Health {
  status: string;
  timestamp: string;
}

// 一次备份的结果（与后端 backupSummarySchema 对齐）。
export interface BackupSummary {
  fileName: string;
  file: string;
  exportedAt: string;
  migrationTag: string | null;
  sizeBytes: number;
  tables: Array<{ name: string; rows: number }>;
}

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupList {
  dir: string;
  items: BackupFileInfo[];
}

// 系统域接口。业务组件通过 react-query 调用这些方法。
export const systemService = {
  health: () => request.get<Health>("/health"),
  // 数据备份（仅管理员）：触发后端导出，落在 backups/ 目录。
  createBackup: () => request.post<BackupSummary>("/system/backup"),
  listBackups: () => request.get<BackupList>("/system/backups"),
};
