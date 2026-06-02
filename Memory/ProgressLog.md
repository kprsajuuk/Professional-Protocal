# ProgressLog — 推进历史

> 轻量记录项目各阶段「做了什么、核心思路」,为后续迭代提供上下文。
> 不追求事无巨细(细节看代码与各文档),倒序排列,最新在上。
> 最后更新:2026-06-02

---

## 阶段 4:应用框架层(2026-06-02)

在业务开发前,先搭好「组件之上、业务之下」的结构化封装,避免后期写乱。

- **决策**:接口走标准 REST(HTTP 状态码 + 统一错误体,成功直接返回数据);现在就搭鉴权骨架;React 全程 hooks。
- **后端**:拆出 `plugins/`(cors/swagger/jwt/errorHandler,用 fastify-plugin 包裹)、`modules/`(system、auth 按域聚合,各带 routes/schema/service)、`config/`、`lib/errors`、`types/fastify.d.ts`;新增 JWT 鉴权(stub 登录 + `authenticate` 装饰器 + 受保护示例 `/auth/me`);统一错误处理与前端拦截器对齐。
- **前端**:封装 axios(`api/http` 拦截器:注入 token、401 跳登录、错误统一提示)+ `request` 泛型 + 分域 `services/`;搭主题(明/暗 algorithm + 持久化)、鉴权(AuthContext/ProtectedRoute)、路由(createBrowserRouter + 懒加载)、布局(Main/Blank)、登录页与仪表盘;基础设施 `config/lib/utils/constants/theme/styles`。
- **未做**:真实用户表与完整鉴权(仅骨架);业务数据模型与页面。

## 阶段 3:技术栈选型(2026-06-01)

- 确定 Node 全栈:前端 Vite+React+TS+antd+axios+dayjs(+Router/Query/Zod);后端 Fastify+Drizzle+better-sqlite3+Zod+OpenAPI;接口 REST+OpenAPI。
- 脚手架两端并验证可运行;记录于 [`TechStack.md`](TechStack.md)。
- 注意点:Node 22 + 联网拉原生二进制;client 的 TypeScript 锁 5.x(openapi-typescript 暂不支持 TS6)。

## 阶段 2:前后端骨架与文档约定(2026-06-01)

- 建立前后端分离骨架 `client/` + `server/`(便于独立维护与多任务)。
- 确立文档策略(hybrid)并写入 [`Conventions.md`](Conventions.md)。

## 阶段 1:记忆层地基(2026-06-01)

- 沉淀项目目的、理念与入口:[`Introduction.md`](Introduction.md)、[`Philosophy.md`](Philosophy.md)、根目录 `AGENTS.md`。
