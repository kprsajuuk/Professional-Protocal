# server/ — 后端服务

> 本目录承载本项目的**后端工程**:Fastify + TypeScript + Drizzle ORM + SQLite + OpenAPI。
> 开始任何工作前,请先阅读根目录的 [`../AGENTS.md`](../AGENTS.md) 与 `../Memory/` 下的记忆文档。
> 最后更新:2026-06-01 ｜ 状态:已脚手架(含 `/health` 与自动生成的 OpenAPI 文档)

---

## 定位

- 本项目采用**前后端分离**架构,本目录是其中的**后端服务**,与前端 [`../client/`](../client/) 解耦、独立维护。
- 数据库 schema(`src/db/schema.ts`)是字段与类型的**唯一事实来源**;接口契约由 Zod schema 自动生成为 OpenAPI(见 [`../Memory/Conventions.md`](../Memory/Conventions.md))。

## 技术栈

Fastify · TypeScript(CommonJS)· Drizzle ORM · better-sqlite3(SQLite)· Zod · @fastify/swagger(+ fastify-type-provider-zod)。精确版本见 `package.json`。

## 运行

> 需要 Node 22+。本机若默认是旧版本,先 `nvm use 22`(项目已带 `.nvmrc`)。

```bash
cd server
npm install
npm run dev        # tsx watch，开发热重载，默认端口 3000
```

启动后:

- 健康检查:`GET http://localhost:3000/health`
- OpenAPI 文档(Swagger UI):`http://localhost:3000/docs`
- OpenAPI JSON:`http://localhost:3000/docs/json`(前端据此生成类型)

## 常用脚本

- `npm run dev` — 开发模式(热重载)
- `npm run build` / `npm start` — 编译到 `dist/` 并以 node 运行
- `npm run typecheck` — 仅类型检查
- `npm run db:generate` / `npm run db:migrate` — Drizzle 迁移(待定义数据模型后使用)

## 目录结构

```text
server/
├── src/
│   ├── server.ts        # 启动入口
│   ├── app.ts           # Fastify 实例 + Zod 类型 provider + OpenAPI
│   ├── config.ts        # 环境配置(端口/数据库路径)
│   ├── routes/          # 路由(当前仅 health)
│   └── db/              # Drizzle 连接与 schema(业务表待下一轮定义)
└── drizzle.config.ts    # drizzle-kit 配置
```

## 当前状态

- 骨架可运行;尚无业务表与业务接口。
- 数据模型与业务 API 待下一轮迭代(先沉淀进 `../Memory/` 再落地)。
