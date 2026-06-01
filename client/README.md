# client/ — 前端服务

> 本目录承载本项目的**前端工程**:Vite + React + TypeScript + Ant Design。
> 开始任何工作前,请先阅读根目录的 [`../AGENTS.md`](../AGENTS.md) 与 `../Memory/` 下的记忆文档。
> 最后更新:2026-06-01 ｜ 状态:已脚手架(含一个演示后端连通性的首页)

---

## 定位

- 本项目采用**前后端分离**架构,本目录是其中的**前端服务**,与后端 [`../server/`](../server/) 解耦、独立维护。
- 与后端通过 REST 交互;接口类型由后端的 OpenAPI 规范**自动生成**(见 [`../Memory/Conventions.md`](../Memory/Conventions.md)),不手写。

## 技术栈

Vite · React 18 · TypeScript · Ant Design(antd)· axios · dayjs · React Router · TanStack Query · Zod。精确版本见 `package.json`。

## 运行

> 需要 Node 22+。本机若默认是旧版本,先 `nvm use 22`(项目已带 `.nvmrc`)。

```bash
cd client
npm install
npm run dev        # Vite，默认端口 5173
```

开发期前端通过 `/api` 前缀访问后端,由 Vite 代理到 `http://localhost:3000`(见 `vite.config.ts`)。首页会调用 `/api/health` 验证与后端的连通性,所以请同时启动后端。

## 接口类型生成

后端启动后,运行:

```bash
npm run gen:api    # 从 http://localhost:3000/docs/json 生成 src/api/schema.d.ts
```

即可获得与后端同源的 TypeScript 接口类型。

## 常用脚本

- `npm run dev` — 开发服务器
- `npm run build` — 类型检查 + 生产构建到 `dist/`
- `npm run preview` — 预览生产构建
- `npm run typecheck` / `npm run lint` / `npm run format`

## 目录结构

```text
client/
├── index.html
├── vite.config.ts        # Vite 配置(含 /api 代理)
└── src/
    ├── main.tsx          # 入口:antd / React Query / Router 装配
    ├── App.tsx           # 演示页(后端连通性)
    └── api/
        └── client.ts     # axios 实例(baseURL=/api)
```

## 当前状态

- 骨架可运行;仅有一个连通性演示页。
- 业务页面与数据交互待下一轮迭代。
