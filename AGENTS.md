# AGENTS.md — 项目入口与导航

> 本文件是本仓库面向 AI agent（以及任何协作者）的**唯一入口**。
> 任何 agent 在开始工作前，都应先读完本文件，再按指引阅读 `Memory/` 下的记忆文档。
> 最后更新：2026-06-06 ｜ 阶段：用户/权限地基已落地，核心人脉关系模型开发中

---

## 一句话项目定位

这是一个**以求职为终极导向的「长期人脉关系经营系统」**：从入学前就开始系统性地收录、归档、统计、跟踪、长期维护与校友／从业者／优质团队／业内人士的关系，用人脉经营对冲 H1B 政策、AI 冲击与裁员带来的就业风险，争取在校期间就锁定高价值且高 sponsor 概率的岗位。

---

## 必读顺序（开始任何工作前）

1. **本文件 `AGENTS.md`** — 了解项目结构与协作约定。
2. **[`Memory/Introduction.md`](Memory/Introduction.md)** — 项目「是什么」：定义、背景、目标、边界。
3. **[`Memory/Philosophy.md`](Memory/Philosophy.md)** — 项目「为什么」：核心理念与底层逻辑，决策时的价值判断依据。
4. **[`Memory/Conventions.md`](Memory/Conventions.md)** — 项目「怎么记 / 怎么维护」：文档策略、活文档维护与工程约定（逻辑层面）。
   - 前端外观/体验规范(美术层面)见 **[`Memory/DesignGuide.md`](Memory/DesignGuide.md)**。
5. **[`Memory/TechStack.md`](Memory/TechStack.md)** — 项目「用什么做」：前后端技术选型与理由（精确版本以 `package.json` 为准）。
6. **[`Memory/Domain.md`](Memory/Domain.md)** — 项目「核心业务模型」：人脉关系经营的领域概念（双层模型、关系阶段等）。**核心业务的思路主轴。**
7. **[`Memory/AccessControl.md`](Memory/AccessControl.md)** — 用户/角色/访问控制的概念、规则与护栏（地基功能）。
8. **[`Memory/ProgressLog.md`](Memory/ProgressLog.md)** — 项目「做到哪了」：各阶段推进历史与核心思路（倒序）。

> 原则：**先读懂内核，再动手。** 本项目的所有需求、设计、代码、接口文档，都应是这些记忆文档的延伸，而非脱离它们独立产生。

---

## 架构

本项目采用**前后端分离**架构，拆为两个独立服务：

- **[`client/`](client/)** — 前端服务，承载前端工程。
- **[`server/`](server/)** — 后端服务，承载后端工程与数据模型。

为什么分离：

- **干净、独立维护**：前后端各自演进、各自构建部署，互不牵绊。
- **技术栈成熟**：分离式架构在当下已是成熟通用做法，没有额外心智负担。
- **便于多任务并行**：可借助 Cursor 多任务，让一个 agent 改前端、另一个 agent 改后端，互不冲突。

真正的前端／后端工程将落在各自目录内；两者通过约定的接口契约交互（契约由代码自动生成，见 [`Memory/Conventions.md`](Memory/Conventions.md)）。技术栈选型待下一轮确定。

---

## 目录地图

| 路径 | 用途 |
| --- | --- |
| `AGENTS.md` | 本文件。agent 入口与导航中枢。 |
| `Memory/` | 项目「记忆」层。存放无法被代码直接定义的东西：目的、理念、概念定义等。 |
| `Memory/Introduction.md` | 项目定义、个人背景、外部环境、核心目标与边界。 |
| `Memory/Philosophy.md` | 核心理念与底层逻辑（长期关系经营、规模化、风险对冲等）。 |
| `Memory/Conventions.md` | 项目约定（逻辑层）：文档与记录策略、活文档维护、工程约定（REST / hooks 等）。 |
| `Memory/DesignGuide.md` | 前端外观/体验规范（美术层）：留白、弹窗、侧栏、顶栏等视觉与交互体感约定。 |
| `Memory/TechStack.md` | 技术选型与理由（前端 Vite/React/antd，后端 Fastify/Drizzle/SQLite，接口 REST+OpenAPI）。 |
| `Memory/Domain.md` | 核心业务领域模型：双层模型（客观人物/账号私有关系）、关系阶段、互动等概念。 |
| `Memory/AccessControl.md` | 用户/角色/访问控制的概念、规则与护栏（精确字段见代码）。 |
| `Memory/ProgressLog.md` | 推进历史：各阶段做了什么、核心思路（倒序）。 |
| `client/` | 前端服务。应用框架层 + 用户管理 + 核心业务页面（人物库/我的关系）。 |
| `server/` | 后端服务。应用框架层 + 用户/鉴权 + 业务模块（persons/relationships/interactions）。 |
| `scripts/` | 脚本收录处。所有快速运行 / 打包 / 部署 / 测试类脚本统一放这里（如 `dev.cmd` / `dev.sh` 一键起前后端）。脚本面向主理人日常使用，实现细节不另作记录。 |
| `README.md` | **对外展示**用（留作 GitHub README）。**不是** agent 入口，agent 不应依赖它获取项目内核。 |
| `Professional-Protocal.code-workspace` | 编辑器工作区配置，无需关注。 |

---

## 约定

项目的文档策略与活文档维护约定统一收纳在 **[`Memory/Conventions.md`](Memory/Conventions.md)**。核心一句话：**md 记「为什么 / 什么意思」，代码记「具体是什么」，接口契约靠生成。** 动手前请先读它。

> **层级一致性（每轮对话都要执行）：** 收到「沉淀/修改某文档」类请求时，先用上面的「目录地图 / 必读顺序」核对该内容是否属于目标文档的层级。若存在层级冲突（例如把 UI 外观沉淀进 `Conventions` 而非 `DesignGuide`），**先指出冲突与正确归属再行动**，不要在语境不匹配时默默完成越级改动。完整定义见 `Conventions.md` 第三节。

---

## 当前阶段状态

- ✅ **地基已立**：项目目的、理念、约定、入口与记忆结构已成文。
- ✅ **架构已定**：前后端分离（`client/` + `server/`）骨架已建立。
- ✅ **技术栈已定**：见 [`Memory/TechStack.md`](Memory/TechStack.md)；`client/`、`server/` 已脚手架化。
- ✅ **应用框架层已搭建**：前端 api/路由/布局/主题/鉴权封装，后端 plugins/modules/统一错误处理/JWT 鉴权。
- ✅ **用户/权限地基已落地**：真实用户表 + 哈希登录 + 角色（admin/user）+ 用户管理；见 [`Memory/AccessControl.md`](Memory/AccessControl.md)。
- 🚧 **核心人脉关系模型（进行中）**：双层模型（共享人物 / 账号私有关系 + 互动时间线）；见 [`Memory/Domain.md`](Memory/Domain.md)。
- ⏳ **待排期（后续迭代）**：维护节奏/提醒、价值×关系矩阵、目标公司与 sponsor 情报、统计看板、资料导入。

> 新业务需求应先明确并写入 `Memory/`（尤其 `Domain.md`），再据此设计与编码。
