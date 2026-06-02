# db/repositories — 仓储层（预留）

本目录用于存放各业务实体的**仓储（repository）**：封装基于 Drizzle 的数据访问，向上层 service/route 暴露语义化方法（如 `findById`、`listByXxx`），把 SQL/ORM 细节收拢在一处。

当前为空——业务数据模型(`../schema.ts`)定义后再逐步填充。约定见 [`../../../../Memory/Conventions.md`](../../../../Memory/Conventions.md)。
