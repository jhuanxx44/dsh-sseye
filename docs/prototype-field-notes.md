# 原型踩坑记录（prototype field notes）

> 迁自 `prototype/README.md`（2026-08-21）。`prototype/` 是 dsh-sseye 毕业为 composition 插件前的**动态 Cordis 插件原型**（v1–v1.6），代码已随毕业删除（git 历史可考）。本文保留其踩坑记录与验证日志——这些是 DSH 动态插件开发的平台级经验，与本项目源码无关的部分同样适用于任何动态插件开发。

## 已验证（2026-08-20，DSH 0.1.0-rc.6 / kimi-k3）

- 捕获主会话每次模型调用，含 messages 全量、system prompt、tools、usage（含 cacheReadTokens）、TTFT、总时长、chunk 计数
- `agent/request` × `llm/stream` 经 AbortSignal 对象身份关联成功，记录标注 `T轮·S步`
- 字段级策略实时生效（关掉 system 后新记录显示「按策略未捕获」）
- 观察器零侵入：tee 的 chunk 原样转发，会话流式输出不受影响
- v1.3：入口挂 `conversation.session.header.utilities`（Session log 旁）；列表按 Turn 分组（Turn N → S 步骤序列，组头聚合 token/耗时）；详情折叠「与前序共享的 N 条消息」只展开新增（带左侧高亮条）；本会话/全部过滤
- v1.5.4：修复浅色模式黑底灰字——CSS 里 7 个主题 token（`--dsw-alias-bg-secondary` 等）在运行时**根本不存在**，深色模式下 fallback 恰好是深色而长期无感。写样式前必须 `Theme.listTokens` 实测
- v1.6：协议 chip 改从真实配置读取——`llm.listConfigurableProviders()` 拿到 `settingsNs` + `settingsPath`，再 `settings.get(ns)` 读 profile 的 `api` / `baseURL`（如 `llm-pi-ai.providers.<route>.api`，值为 pi-ai 的 `KnownApi`：`openai-completions` / `openai-responses` / `anthropic-messages` / `google-generative-ai` …）；adapter 未声明协议的 route 才退回静态猜测表并以 `~` 标注。Wire JSON 重建仅在 `openai-completions` 下展示

## 踩坑记录

1. **`harness.handle` 返回值必须是 lossless JSON**：不允许 `undefined` 值（可选字段要条件性省略，不要显式赋 `undefined`）、不允许 Date/Map/class 实例。
2. **新页面不自动激活 Client 半**：`reconcileApprovals` 只处理 pending 状态的 attempt；已 committed 的 run 对新连接的页面显示「Client 待激活」，需要在「Cordis 插件」面板点「运行」（`startUserRun`，用户手势即授权）。毕业版若希望刷新后自动恢复，需要研究这一层。
3. **列表高频轮询 + 行重渲染会让 a11y ref 快速漂移**——自动化测试点击行时要先重新 snapshot。
4. **`cordis_define` 的 Package 是全量替换，不是合并**：pkg-5 曾只传了 `code.client`，运行后 Host 半变成 `absent`——面板能开但零捕获、RPC 全挂。每次 define 必须同时带上 host 和 client 两半，哪怕其中一半没变。
5. **大内容渲染必须懒挂载 + 轮询要去重**：`<details>` 折叠只是视觉隐藏，子节点全部真实挂载。400+ 条消息全量挂载 × 1.5s 轮询全量重渲染会把页面主线程卡死。v1.5.1 修复：大区段改为 `Section` 组件按状态懒挂载（点开才渲染）、list 轮询做签名去重（内容没变不触发重渲染）、详情只在记录仍 running 时重拉。毕业版要虚拟化长列表。
6. **Client 半绑定 pluginRunId，重跑后旧页面即变砖（stale-run）**：任何 `cordis_run` update/重跑之后，已加载旧 Client 半的页面上所有 `host.call` 都会收到 `stale-run` 错误（"belongs to an activation that has already been replaced"），且不会自愈——必须刷新页面并重新点「运行」。调试期若面板数据停滞，先怀疑这个。毕业成 composition 插件后此问题自然消失（客户端随页面加载）。
7. **catch 空捕获会吃掉所有线索**：pkg-5→pkg-9 的谜题（详情加载不出、捕获看似归零）实际是 stale-run，被 `.catch(() => {})` 吞掉。所有 `host.call` 的 catch 至少要 `console.error`。
8. **共享前缀对比对「易变前缀」脆弱**：如果请求头部包含每次调用都变的内容（如运行时上下文 system-reminder），shared prefix 会在 index 0-1 就断掉，退化为全量。v1.5.3 加了窗口化兜底（最新 30 条直渲，更早的懒挂载）。另外 sharedPrefixCount 是逐条 JSON.stringify 对比，700+ 条的记录要算几秒——毕业版应换 hash 指纹。
9. **主题 token 必须实测，不能凭文档/命名习惯猜**：v1.5.4 之前 CSS 用了 7 个不存在的 token（`--dsw-alias-bg-secondary`、`--dsw-alias-label-tertiary`、`--dsw-alias-state-business-primary`、`--dsw-alias-interactive-bg-hover`、`--dsw-alias-markdown-code-block`、`--dsw-alias-button-ghost-active-fill`、`--dsw-alias-state-warn-label`），深色模式下 fallback 无感，浅色模式直接黑底灰字。实测可用清单以 `Theme.listTokens` 为准（本机 13 个：bg-base / bg-layer-1 / bg-layer-2 / bg-overlay / border-l1 / border-l2 / brand-primary / label-primary / label-secondary / state-error/success/warn-primary / sidebar-fill）。
10. **协议真相在 settings profile，不在 llm 服务门面**：`LlmProviderInfo` / `LlmResolvedModelInfo` 都没有协议字段；但 `llm.listConfigurableProviders()` 给出 `settingsNs` + `settingsPath`，`settings.get(ns)` 沿路径取到 profile，`api` / `baseURL` 就在上面（pi-ai adapter）。注意 `settings.get` 拿到的是 live 解析结果，只读叶子字段，别整个塞进记录。
