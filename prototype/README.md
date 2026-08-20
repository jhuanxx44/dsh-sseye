# prototype/ — 动态 Cordis 插件原型

这是 dsh-sseye 的 v1 原型源码，以**动态 Cordis 插件**形态运行（不安装、进程内、会话级）。

- `host.js` — Host 半：`code.host`。挂 `llm/stream` waterfall 捕获每次模型调用的完整 `GenerateOptions` 与响应 chunk 流；挂 `agent/request` 通过共享 `AbortSignal` 关联 turn/step 坐标；100 条 ring buffer；抓取策略（来源/字段/脱敏）；5 个 `harness.handle` RPC：`list` / `get` / `clear` / `get-policy` / `set-policy`。
- `client.js` — Client 半：`code.client`。`sidebar.footer.action` 入口按钮 + `shell.overlay` 调试台面板（调用列表 / 详情 / 抓取策略区），1.5s `host.call` 轮询。

## 运行方式

在 cordis preset 会话里，把两个文件内容分别作为 `cordis_define` 的 `code.host` / `code.client` 提交，然后 `cordis_run` 激活。

## 已验证（2026-08-20，DSH 0.1.0-rc.6 / kimi-k3）

- 捕获主会话每次模型调用，含 messages 全量、system prompt、tools、usage（含 cacheReadTokens）、TTFT、总时长、chunk 计数
- `agent/request` × `llm/stream` 经 AbortSignal 对象身份关联成功，记录标注 `T轮·S步`
- 字段级策略实时生效（关掉 system 后新记录显示「按策略未捕获」）
- 观察器零侵入：tee 的 chunk 原样转发，会话流式输出不受影响
- v1.3：入口挂 `conversation.session.header.utilities`（Session log 旁）；列表按 Turn 分组（Turn N → S 步骤序列，组头聚合 token/耗时）；详情折叠「与前序共享的 N 条消息」只展开新增（带左侧高亮条）；本会话/全部过滤；协议 chip 为 provider 推断表（`LlmProviderInfo` 无协议字段，未知 provider 不显示，诚实留白）

## 踩坑记录（毕业成独立插件时要带走的经验）

1. **`harness.handle` 返回值必须是 lossless JSON**：不允许 `undefined` 值（可选字段要条件性省略，不要显式赋 `undefined`）、不允许 Date/Map/class 实例。
2. **新页面不自动激活 Client 半**：`reconcileApprovals` 只处理 pending 状态的 attempt；已 committed 的 run 对新连接的页面显示「Client 待激活」，需要在「Cordis 插件」面板点「运行」（`startUserRun`，用户手势即授权）。毕业版若希望刷新后自动恢复，需要研究这一层。
3. **列表高频轮询 + 行重渲染会让 a11y ref 快速漂移**——自动化测试点击行时要先重新 snapshot。
