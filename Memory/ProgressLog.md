# ProgressLog — 推进历史

> 轻量记录项目各阶段「做了什么、核心思路」,为后续迭代提供上下文。
> 不追求事无巨细(细节看代码与各文档),倒序排列,最新在上。
> 最后更新:2026-07-02

---

## 阶段 8:半自动数据采集与导入 v1(2026-07-02)

破解"零数据"瓶颈:打通一条**由人眼筛选、脚本搬运**的采集通道(先只 LinkedIn)。指导思想沉淀进数据治理维度 [`DataGovernance.md`](DataGovernance.md)(采集是「数据进入」的一种实现;已登记进 AGENTS)。核心取舍:**半自动而非全自动**(价值密度 > 数据量,避开 ToS/封号风险),**捕获层可替换、下游管道固定**。

- **架构(hybrid)**:捕获脚本独立为顶层 `capture/`(跑在第三方页面里、不属于 SPA,是后端的又一客户端);解析/入库**不另起服务**,进现有 `server/ modules/intake`(复用同一 DB/鉴权/AI 端点/Person 模型);审阅页进 `client/`。三者只经 REST 契约交互。
- **固定管道**:`原始内容 → AI 解析成 Person 草稿 → 人审阅/查重 → 入库`。捕获只负责"把原文搬回来先存下"(即时返回不阻塞浏览页),解析是之后独立的一步(可对历史原文重跑,不为丢弃项浪费模型调用)。
- **后端**:新表 `intake_items`(账号私有暂存区,状态机 `pending→parsed→imported/discarded`,存原文+来源+草稿+回填 personId);`users` 加长效 `intakeToken`(捕获脚本用自定义头 `x-intake-token` 投递,免 JWT 过期)。`modules/intake`:`POST /intake`(token 鉴权存原文)、list/get、`parse`(调默认端点抽草稿+查重命中)、`import`(走现有 Person 创建、回填)、`discard`。`ai.service` 加 `parsePersonFromRaw`(复用 OpenAI 兼容客户端 + 宽松 JSON 容错)。
- **捕获脚本**:`capture/linkedin.user.js` 油猴脚本——LinkedIn 页悬浮按钮抓当前页原文 + URL,`GM_xmlhttpRequest` 投递(绕过跨域/CSP),`baseUrl`/`token` 菜单命令配置。
- **前端**:「导入收件箱」页(pending 列表 → 原文/草稿/查重提示 → 编辑 → 确认入库/丢弃)+ 路由与菜单;个人主页加「采集 token」卡片(查看/重置 + 脚本配置提示)。
- **AI 铁律延续**:AI 解析出的只是**待确认草稿**(缺失留空、不编造),只有人在收件箱点头才写进人物库。
- **本轮不做**:全自动爬虫/批量遍历、Handshake 及其他源、浏览器插件形态、自动去重合并(仅给提示)。

## 阶段 7:AI 顾问 v1 + 模型对接(2026-06-18)

为系统接入 AI。指导思想与领域概念沉淀见 [`AI.md`](AI.md)(已登记进 AGENTS)。铁律:**AI 只产判断/草稿,绝不自动写事实层**。

- **模型对接**:统一抽象成 OpenAI 兼容 Chat Completions(本地 Ollama/OpenWebUI/OpenAI 等通用),`kind` 字段留多供应商接缝(当前仅 `openai-compatible`)。新表 `ai_providers`(全局,admin 在系统管理页增删改 + 测试连接 + 设默认;apiKey 可空,本地免鉴权;明文存储是已知弱点,见 AI.md)。
- **我的资料**:`users.personId` 关联一条 Person 承载「我的事实背景」(复用人物/经历模型与编辑表单);新表 `self_profiles` 承载主观的 AI 人设/偏好(定位/能带来什么/在找什么/语气/常驻背景)。人物库与关系目标选择按 `excludeSelf` 过滤掉自己,且不能与自己建关系。
- **破冰建议(极小可用)**:关系详情页「AI 建议」→ 组装[我的 Person+偏好 / 对方 Person / 关系 / 互动史]调默认端点 → 返回 `{assessment, angle, draftMessage}`(宽松 JSON 解析,失败回退原文)。**结果不落库**;弹窗草稿可编辑可复制,人确认后手动发出、再手动记互动。
- **后端**:`modules/ai`(OpenAI 兼容客户端 + provider CRUD/test + icebreaker)、`modules/profile`(`/me/profile`、关联我的 Person、`/me/preferences`);新增迁移 `0002`(circular FK 用 `AnySQLiteColumn` 注解破解类型死锁)。
- **验证**:两端 typecheck/lint;Fastify inject + mock OpenAI 端点跑通 provider 创建/测试/默认、我的资料、excludeSelf(4→3)、自关系被拒(400)、icebreaker 解析正确。

## 阶段 6.4:系统管理页 + 一键备份(2026-06-18)

把阶段 6.3 的导出能力从纯 CLI 接到前端:管理员可在页面一键备份,无需开终端。

- **后端**:抽出可复用核心 `server/src/db/tools/backup.ts`(`createBackup` / `listBackupFiles`),`db:export` CLI 改为薄壳复用它(单一事实来源)。`system` 模块新增管理员守卫接口:`POST /system/backup`(导出并落 `backups/`,返回文件名/路径/各表行数)、`GET /system/backups`(历史清单 + 落盘目录)。
- **前端**:新增「系统管理」页(`/system`,仅 admin,侧栏 `SettingOutlined`),承载数据备份卡片——「立即备份」按钮 + 历史备份表 + 可复制的备份目录路径。`system` service 加 `createBackup`/`listBackups`。后续系统级功能统一归到此页。
- **定位**:备份文件不经浏览器下载,直接落后端服务器目录(与 CLI 同一处),页面只负责触发与展示「在哪、有哪些」。
- **验证**:两端 typecheck/lint 通过;`db:export` 重构后照常工作;Fastify inject 跑通 admin 登录 → 备份(201)→ 清单(200)→ 未授权(401)。

## 阶段 6.3:数据导入导出工具 — 抗重置(2026-06-18)

测试期改表常需重置数据库,为「录入的数据不丢」做一个自描述的导出/导入 CLI。详细用法见 [`../DEV_NOTES.md`](../DEV_NOTES.md)。

- **原则**:导出端稳定通用、**自描述**(数据 + 列描述 + 迁移版本戳);导入端视为「一次性适配器」,每次破坏性变更按需替换——不追求永久通用导入器,只让「换导入器」变便宜。
- **实现**:`server/src/db/tools/`(走原始 better-sqlite3,值原样进出)。`db:export` → `server/backups/dump-<ts>.json`;`db:import [文件] [--apply]` 默认 dry-run 做列三类 diff(自动映射/新增/旧列丢失)并**自动打印可粘贴的 transforms 骨架**,`--apply` 才在事务里按 FK 顺序清空+写回;预留按表 `transforms` 钩子处理语义转换(如旧 `company` 文本→新 `companyId` 外键)。
- **验证**:同 schema 全列自动映射;模拟破坏性变更能正确报差异并出骨架;真实「导出→删库→重建→`--apply`→重新登录」闭环通过。
- **定位**:属于开发工具,运行手册落 `DEV_NOTES`,不进概念层文档。

## 阶段 6.2:筛选/排序 + 公司/学校实体(2026-06-04)

围绕"找得到、排得出"补齐核心可用性,并把公司/学校从自由文本升级为规范化实体。概念沉淀见 [`Domain.md`](Domain.md)。

- **决策**:上次联系时间**派生**自互动 `MAX(occurredAt)`(单一事实来源、不加冗余列);公司/学校引入**规范化实体表**(模糊搜索 + find-or-create 去重),公司本轮**扁平**(母子层级/按母公司聚合推迟);"按人物属性筛选关系"待 School 就绪后再加。
- **后端**:新增 `companies`/`schools` 表 + 重新生成业务迁移(work/edu 改为外键引用);`lookups` repo(search + 大小写不敏感 find-or-create)与搜索路由;persons 支持按性别/学校/当前公司筛选、按更新时间/年龄排序,详情 join 实体名;relationships 支持按阶段(漏斗序)/信任亲近/上次联系排序并返回派生 `lastContactedAt`。
- **前端**:`LookupAutoComplete`(录入,搜索+新建)、`LookupSelect`(筛选,返回 id);人物表单公司/学校改为搜索录入;人物库加性别/学校/公司筛选 + 排序控件;我的关系加排序控件 + 上次联系列。
- **验证**:迁移重建;两端 typecheck/lint/build 通过;curl/Node 闭环验证 Google/google·CMU/cmu 去重、公司/性别筛选、年龄排序、关系按上次联系/阶段排序。

## 阶段 6.1:核心概念校准(2026-06-04 · 仅文档)

围绕「评级」与「可扩展性」两点深化认知,沉淀进 [`Philosophy.md`](Philosophy.md) 与 [`Domain.md`](Domain.md),本轮不动代码。

- **边为核心(Philosophy 七):** 市面产品都在经营「点」(Person)并撮合后撒手;本项目的真正价值是看护两点之间那条看不见的「边」(Relationship)及其演进。关系经营价值超越求职本身(信任不可转让、只能积累)。
- **事实 vs 判断(Domain 四):** 资料/经历/互动是事实地基;阶段/评级/信任是主观判断,会变会错、可修订、不可当真相。了解对方态度优先记录「行为信号」而非猜测心理分。
- **评级是透镜不是真相(Domain 五):** 多维(信任/亲近、价值认可、可引荐——对应现有三列)、可选、非权威,只作规模化下的精力分配提示;评级历史快照列为演进方向(本轮不做)。
- **扩展接缝(Domain 六):** 核心始终是 Person;只留轻量接缝(预留关系「目标类型」概念,默认 person),不过度泛化;`targetType` 代码落地留待下一轮。
- **决策记录:** 评级结构本轮选「保留现有标量列、只校准语义」;扩展用轻量接缝;先沉淀文档、代码下一轮。

## 阶段 6:核心人脉关系模型 — lean v1(2026-06-03)

项目进入真正的核心:把"关系的演进"系统化承载。概念主轴见 [`Domain.md`](Domain.md)。

- **架构基石**:双层模型——客观 `Person`(共享、可协作)与账号私有的 `Relationship` + `Interaction`(互动时间线)。这是区别于通讯录的根本。
- **归属决策**:混合(lean 实现)——人物共享 + 关系/互动私有 + 私人备注承载私有标注;字段级覆盖、去重合并推迟。
- **关系阶段(漏斗)**:识别→已建联→互动中→信任建立→可引荐,作为跟踪/统计主轴。
- **后端**:新增 5 张表(persons/work_experiences/education_experiences/relationships/interactions);模块 persons(共享 CRUD + 经历子资源)、relationships(owner 作用域 + 阶段过滤)、interactions(关系下时间线)。
- **前端**:人物库(共享目录)+ 我的关系(列表 + 关系详情页:人物信息 + 关系面板 + 互动时间线)。
- **本轮不做**:维护节奏/提醒、价值矩阵、目标公司/ sponsor 情报、统计看板、资料自动导入(见 Domain.md 边界)。

## 阶段 5.1:前端体感精修(2026-06-03)

地基功能就绪后,按用户视角打磨外观/交互(详见新文档 [`DesignGuide.md`](DesignGuide.md))。

- **外观**:侧栏标题两行展示(Professional / Protocal)、菜单加图标且收起仅显图标;顶栏精简为「主题图标 + 头像悬浮菜单(个人信息/退出)」;新增个人信息页(`/profile`,改密入口移至此);登录页标题下加 Divider;弹窗正文加上边距。
- **登录态 bug 修复**:axios 拦截器不再把"登录接口自身的 401"当作会话过期(避免登错密码误伤其他标签页的会话);已登录访问 `/login` 自动跳入应用。
- **其他**:密码最小长度 6→4;引入 `@ant-design/icons`。
- **新增规范**:`Memory/DesignGuide.md`——前端美术/体验规范(与 Conventions 的逻辑约定互补)。

## 阶段 5:用户 / 权限地基(2026-06-03)

第一个真实业务需求,也是后续所有业务的地基:把 stub 登录升级为真实用户系统。概念见 [`AccessControl.md`](AccessControl.md)。

- **决策**:角色仅 admin/user 两类(不做 RBAC/部门);管理员管理所有用户 + 任意用户自助改密;密码用 Node 内置 `scrypt` 哈希(无原生依赖);JWT 仅访问令牌带过期;首启播种 `admin/admin`;启动自动迁移 + 播种,开箱即用。护栏:不能删/停用自己、不能删/降级最后一个管理员。
- **后端**:新增 `users` 表(`db/schema.ts`,首张业务表)+ 迁移(`drizzle/`);`lib/password`(scrypt)、`db/bootstrap`(迁移+播种)、`db/repositories/users`;auth 改为查库校验 + 停用拦截、`/auth/me` 返回完整资料、新增自助改密 `POST /auth/password`;新增 `modules/users`(管理员专属 CRUD + reset-password);`jwt` 插件加 `authorizeAdmin` 守卫。
- **前端**:`services/users` + 扩展 `services/auth`(role/改密);`AuthContext` 暴露 `isAdmin`;`RoleRoute` 管理员守卫 + `/users` 路由;`MainLayout` 按角色显示「用户管理」、顶栏显示显示名 + 「修改密码」;`UsersPage`(表格 + 增删改查 + 重置密码)、`UserFormModal`、`ResetPasswordModal`、`ChangePasswordModal`。
- **验证**:后端 curl 跑通登录/CRUD/改密/停用/401/403/护栏;两端 typecheck/build 通过。

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
