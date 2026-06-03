# DEV_NOTES — 开发者运行手记

> 给「我自己」看的随手速查:怎么启动、怎么打包、访问哪个地址。
> 这是一份临时/随手记录，**不纳入 agent 必读与维护流程**，不追求与其他文档同步。
> 底部留有「个人手记」区，随便记。

---

## 0. 环境准备（重要）

本项目需要 **Node 22+**。本机 nvm 默认可能是旧版本，进任一子项目先切换：

```bash
nvm use 22        # 两个项目都带了 .nvmrc，直接 nvm use 即可
```

首次拉取代码后，分别安装依赖：

```bash
cd server && npm install
cd client && npm install
```

> 后端含原生模块 better-sqlite3，`npm install` 时需联网（自动拉预编译二进制）。

---

## 1. 启动（开发模式）

开两个终端，分别启动前端和后端：

```bash
# 终端 A — 后端（端口 3000，热重载）
cd server
npm run dev

# 终端 B — 前端（端口 5173）
cd client
npm run dev
```

### 访问地址

| 用途 | 地址 |
| --- | --- |
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| 后端健康检查 | http://localhost:3000/health |
| OpenAPI 文档(Swagger UI) | http://localhost:3000/docs |
| OpenAPI JSON | http://localhost:3000/docs/json |

> 前端通过 `/api` 前缀访问后端，由 Vite 代理到 `:3000`（见 `client/vite.config.ts`）。
> 默认管理员凭据：用户名 `admin` / 密码 `admin`（首次启动且用户表为空时自动播种，可用环境变量 `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` 覆盖）。
> 后端启动时**自动应用迁移并播种管理员**，无需手动跑迁移即可开箱运行；数据库文件默认 `server/data.sqlite`（删掉它即可重置数据，会重新播种 admin/admin）。
> 「用户管理」菜单仅管理员可见；任意用户可在顶栏「修改密码」自助改密。

---

## 2. 打包（生产构建）

```bash
# 后端：编译到 server/dist，再用 node 运行
cd server
npm run build      # tsc 编译
npm start          # node dist/server.js

# 前端：类型检查 + 构建到 client/dist
cd client
npm run build
npm run preview    # 本地预览生产构建
```

---

## 3. 常用脚本速查

### 后端 `server/`
- `npm run dev` — 开发热重载
- `npm run build` / `npm start` — 构建 / 运行产物
- `npm run typecheck` — 仅类型检查
- `npm run db:generate` — 改了 `db/schema.ts` 后生成迁移文件（提交进仓库）
- `npm run db:migrate` — 手动应用迁移（一般无需:`npm run dev`/`npm start` 启动时会自动迁移）

### 前端 `client/`
- `npm run dev` — 开发服务器
- `npm run build` — 类型检查 + 构建
- `npm run preview` — 预览生产构建
- `npm run lint` / `npm run format` — 代码检查 / 格式化
- `npm run gen:api` — 从后端 OpenAPI 生成接口类型（需后端先启动）

---

## 4. 个人手记（随便记）

<!-- 在这里随手记录：临时端口、调试备忘、踩过的坑、待办点子等 -->

-
