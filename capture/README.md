# capture/ — 采集脚本

跑在**第三方站点页面里**的浏览器脚本，用来把「我正在看的这一页」的原文一键搬回 Professional-Protocal 后端。它**不属于前端 SPA**（`client/`），是后端的又一个客户端，只通过 REST 契约（`POST /intake`）投递数据。

设计原则与边界见 [`../Memory/DataGovernance.md`](../Memory/DataGovernance.md)：**由人眼筛选、脚本搬运**，半自动而非全自动。脚本不遍历、不翻页、不批量抓取——它只搬运当前这一页。

## 文件

- `linkedin.user.js` —— LinkedIn 采集用的油猴（Tampermonkey）脚本。

## 安装与使用（LinkedIn）

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. Tampermonkey → 新建脚本 → 把 `linkedin.user.js` 全文粘进去 → 保存。
3. 在 Tampermonkey 的脚本菜单里执行两条配置命令：
   - **配置后端地址**：填后端根地址（不含 `/intake`），如 `http://localhost:3000` 或局域网 `http://192.168.1.10:3000`。
   - **配置采集令牌**：在应用里打开 **个人主页 → 采集令牌**，生成/复制令牌后填入。
4. 打开一个你感兴趣的 LinkedIn 个人页，点右上角悬浮按钮 **「采集到 PP」**。
5. 回到应用 **「导入收件箱」**：对刚采集的条目点「解析」（AI 抽成 Person 草稿）→ 审阅/查重/编辑 → 「确认入库」。

## 工作原理

```
LinkedIn 页面 --(GM_xmlhttpRequest, x-intake-token)--> 后端 POST /intake  →  intake_items(pending)
                                                              ↓ 你在收件箱点「解析」
                                                        AI 解析成 Person 草稿(parsed)
                                                              ↓ 你审阅确认
                                                          写入人物库(imported)
```

- 用 `GM_xmlhttpRequest` 投递，可绕过页面的跨域/CSP 限制（普通网页脚本做不到）。
- 令牌走自定义头 `x-intake-token`，与账号绑定、长效（免 JWT 过期）；在个人主页可随时重置。
- 抓取的是当前页 `main` 区域的可见文本（退化到整页），连同页面 URL 一起投递作为可追溯证据。

## 边界

只采集你有正当理由查看的公开页面，节奏贴近人手动浏览；不做大规模自动遍历、不绕付费墙、不碰非公开数据。风险主要压在这一层，故本脚本保持轻、可弃、单人自用。

## 后续

Handshake / 招聘站适配、升级为正式浏览器插件等都在此目录演进，下游后端管道（解析/入库/审阅）保持不变。见 [`../Memory/DataGovernance.md`](../Memory/DataGovernance.md) 的「明确不做」。
