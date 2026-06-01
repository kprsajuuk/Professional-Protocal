# TechStack — 技术选型与理由

> 本文件记录技术选型的**决策与理由**(为什么选它)。
> **精确版本号不在这里**——以各自的 `client/package.json` 与 `server/package.json` 为唯一事实来源(见 [`Conventions.md`](Conventions.md))。
> 最后更新:2026-06-01 ｜ 状态:活文档,会随认知迭代

---

## 总体原则

- **以 Node 生态为主**:本人前端出身、本机即 Node 环境,选 Node 全栈最好运行、心智负担最低。
- **轻量、易迁移、免运维**:数据库用 SQLite,无需独立服务,便于迁移与备份。
- **前后端分离但不强行 monorepo**:`client/` 与 `server/` 各自独立(各自 `package.json`),契合"分开维护更干净"与 Cursor 多任务并行。
- **类型安全贯穿前后端**:用 OpenAPI 让接口类型从后端流向前端,减少手写与漂移。

---

## 前端(`client/`)

| 选型 | 角色 | 理由 |
| --- | --- | --- |
| Node 22.x | 运行时 | 本机现有环境,长期支持版。 |
| Vite | 构建/开发服务器 | 现代前端事实标准,启动快、配置少。 |
| TypeScript (tsx) | 语言 | 类型安全,与后端 OpenAPI 生成的类型对接。 |
| React | UI 框架 | 本人熟悉,生态最大。 |
| antd (Ant Design) | UI 组件库 | 表格/表单/筛选等后台类组件开箱即用,契合"列表+详情+跟踪"场景。 |
| axios | HTTP 客户端 | 拦截器/错误处理成熟。 |
| dayjs | 日期处理 | 轻量,与 antd 默认日期库一致。 |
| React Router | 路由 | 多页面导航。 |
| TanStack Query | 服务端状态 | 请求缓存/重试/失效,省去大量样板。 |
| Zod | 运行时校验 + 类型 | 表单与数据校验。 |
| ESLint + Prettier | 代码规范 | 统一风格。 |

---

## 后端(`server/`)

| 选型 | 角色 | 理由 |
| --- | --- | --- |
| Node 22.x | 运行时 | 与前端一致。 |
| Fastify | Web 框架 | TS 一等公民、性能好、对 schema/OpenAPI 生态最友好,上手不难。 |
| TypeScript | 语言 | 类型安全。 |
| Drizzle ORM | 数据访问 | TS-first、轻量、完美适配 SQLite;**schema 写在 TS 里,作为字段与类型的唯一事实来源**。 |
| better-sqlite3 | SQLite 驱动 | 同步 API、快、稳定,Drizzle 官方推荐组合。 |
| Zod | 输入校验 | 请求体/参数校验,并作为 OpenAPI schema 来源。 |
| @fastify/swagger + fastify-type-provider-zod | OpenAPI 生成 | 由 Zod schema 自动生成 OpenAPI 文档,无需手写接口文档。 |

---

## 接口契约方案:REST + OpenAPI

- 后端用 Zod 定义请求/响应 schema → Fastify 自动汇总为 **OpenAPI 规范**(暴露为 `/docs` 与 `/docs/json`)。
- 前端用 **openapi-typescript** 从该规范生成 TS 类型,供 axios 调用时使用。
- 这样接口契约**与代码同源、自动生成**,不手写、不漂移(见 [`Conventions.md`](Conventions.md))。
- 选 REST + OpenAPI 而非 tRPC:它是行业标准、对外通用、面试常考,对本项目"求职导向"额外有学习/简历价值。

---

## 暂未决定 / 后续

- 部署方式(本地优先;未来再议托管)。
- 鉴权方案(单用户工具,初期可能无需复杂鉴权)。
- 这些将在需要时讨论并记录。
