/**
 * dsh-sseye — UI strings (i18n).
 *
 * English is the default locale. The Host half's plugin config switches the
 * panel to Chinese (`locale: 'zh-CN'` on the composition row, e.g. through an
 * id-targeted override in the profile's cordis.patch.yml); the Client learns
 * it at startup from GET /__sseye/config.
 *
 * Both dictionaries must carry the exact same key set — the i18n test
 * asserts parity, since the bundle build does not typecheck.
 */

export type Locale = 'en' | 'zh'

export function normalizeLocale(v: unknown): Locale {
  return typeof v === 'string' && v.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const en = {
  'copy': 'Copy',
  'json.expandMore': '… expand {more} more items ({total} total; full content via the copy button)',
  'json.moreChars': '…[+{n} chars]',
  'text.truncated': '\n…[truncated, {n} chars total]',
  'block.imageOmitted': '[image omitted]',
  'row.downloadCall': 'Download this call (JSON)',
  'group.turn': 'Turn {n}',
  'group.compaction': 'Compaction',
  'group.sessionTitle': 'Session title',
  'group.other': 'Other calls',
  'group.calls': '{n} calls',
  'group.calls.one': '{n} call',
  'group.running': ' · {n} running',
  'group.downloadAll': 'Download all calls in this group (JSON)',
  'msg.toolResultRole': 'Normalized layer: role=user (tool-result blocks); the wire layer expands them to role:"tool"',
  'msg.chars': '{n} chars',
  'hero.duration': 'Duration',
  'hero.cacheHit': 'cache hit {pct}%',
  'hero.apiGuessed': ' (guessed from provider)',
  'hero.apiConfigured': ' (from provider config)',
  'hero.download': 'Download',
  'req.systemPrompt': 'System Prompt ({n} chars)',
  'req.systemOmitted': 'System Prompt (not captured per policy)',
  'req.messagesHeader': 'Messages ({n} total{rest})',
  'req.messagesShared': ' · {n} shared with the previous call',
  'req.messagesNew': ' · {n} new',
  'req.sharedMessages': 'First {n} messages shared with the previous call (click to expand)',
  'req.sharedMessages.one': 'First {n} message shared with the previous call (click to expand)',
  'req.olderMessages': '{n} older messages (click to expand)',
  'req.olderMessages.one': '{n} older message (click to expand)',
  'req.messagesOmitted': 'Messages ({n}, not captured per policy)',
  'req.tools': 'Tools ({n})',
  'req.wire': 'Wire JSON (reconstructed, approximate)',
  'detail.loading': 'Loading…',
  'detail.error': 'Error',
  'detail.response': 'Response · {n} blocks',
  'detail.response.one': 'Response · {n} block',
  'policy.sources': 'Sources:',
  'policy.fields': 'Fields:',
  'policy.capacity': 'Capacity:',
  'policy.src.agent': 'Agent calls',
  'policy.src.compaction': 'Compaction',
  'policy.src.title': 'Session title',
  'policy.src.other': 'Other / replays',
  'policy.fld.text': 'text',
  'policy.fld.toolArgs': 'tool args',
  'policy.lim.capacity': 'Buffer records',
  'policy.lim.maxString': 'Request field cap',
  'policy.lim.maxBlock': 'Response block cap',
  'policy.limRange': 'Range {min} – {max}, applies on blur',
  'policy.limitsNote': 'Truncation applies only to content captured afterwards; lowering the buffer size immediately drops the oldest records',
  'policy.redactPlaceholder': 'Redaction regexes, one per line; matches become *** (applies on blur)',
  'panel.turns': '{n} turns',
  'panel.turns.one': '{n} turn',
  'panel.thisSession': 'This session',
  'panel.all': 'All',
  'panel.hidePolicy': 'Hide policy',
  'panel.showPolicy': 'Capture policy',
  'panel.clear': 'Clear',
  'panel.close': 'Close',
  'panel.empty': 'No captures yet. Records appear here once a conversation or call runs.',
  'trigger.title': 'SSEye · LLM debug console',
} as const

export type StringKey = keyof typeof en

const zh: Record<StringKey, string> = {
  'copy': '复制',
  'json.expandMore': '… 展开 {more} 项（共 {total}，完整内容可复制）',
  'json.moreChars': '…[+{n} 字符]',
  'text.truncated': '\n…[截断，共 {n} 字符]',
  'block.imageOmitted': '[image 已省略]',
  'row.downloadCall': '下载该调用（JSON）',
  'group.turn': 'Turn {n}',
  'group.compaction': 'Compaction',
  'group.sessionTitle': '会话标题',
  'group.other': '其他调用',
  'group.calls': '{n} 次调用',
  'group.calls.one': '{n} 次调用',
  'group.running': ' · {n} 进行中',
  'group.downloadAll': '下载本组全部调用（JSON）',
  'msg.toolResultRole': '规范化层 role=user（工具结果块）；wire 层展开为 role:"tool"',
  'msg.chars': '{n} 字符',
  'hero.duration': '总时长',
  'hero.cacheHit': 'cache 命中 {pct}%',
  'hero.apiGuessed': '（按 provider 猜测）',
  'hero.apiConfigured': '（来自 provider 配置）',
  'hero.download': '下载',
  'req.systemPrompt': 'System Prompt（{n} 字符）',
  'req.systemOmitted': 'System Prompt（按策略未捕获）',
  'req.messagesHeader': 'Messages（共 {n} 条{rest}）',
  'req.messagesShared': ' · 与前序共享 {n} 条',
  'req.messagesNew': ' · 新增 {n} 条',
  'req.sharedMessages': '与前一次调用共享的前 {n} 条消息（点击展开）',
  'req.sharedMessages.one': '与前一次调用共享的前 {n} 条消息（点击展开）',
  'req.olderMessages': '更早的 {n} 条消息（点击展开）',
  'req.olderMessages.one': '更早的 {n} 条消息（点击展开）',
  'req.messagesOmitted': 'Messages（{n} 条，按策略未捕获）',
  'req.tools': 'Tools（{n} 个）',
  'req.wire': 'Wire JSON（重建，近似）',
  'detail.loading': '加载中…',
  'detail.error': '错误',
  'detail.response': '响应 · {n} 个块',
  'detail.response.one': '响应 · {n} 个块',
  'policy.sources': '来源：',
  'policy.fields': '字段：',
  'policy.capacity': '容量：',
  'policy.src.agent': 'Agent 调用',
  'policy.src.compaction': 'Compaction',
  'policy.src.title': '会话标题',
  'policy.src.other': '其他/重放',
  'policy.fld.text': '正文',
  'policy.fld.toolArgs': '工具参数',
  'policy.lim.capacity': '缓冲条数',
  'policy.lim.maxString': '请求字段截断',
  'policy.lim.maxBlock': '响应块截断',
  'policy.limRange': '范围 {min} – {max}，失焦生效',
  'policy.limitsNote': '截断只作用于之后的捕获内容；调小缓冲条数会立即裁掉最旧的记录',
  'policy.redactPlaceholder': '脱敏正则，每行一条；命中替换为 ***（失焦生效）',
  'panel.turns': '{n} 轮',
  'panel.turns.one': '{n} 轮',
  'panel.thisSession': '本会话',
  'panel.all': '全部',
  'panel.hidePolicy': '收起策略',
  'panel.showPolicy': '抓取策略',
  'panel.clear': '清空',
  'panel.close': '关闭',
  'panel.empty': '暂无捕获。发起一次对话或调用后此处出现记录。',
  'trigger.title': 'SSEye · LLM 调试台',
}

const dicts: Record<Locale, Record<StringKey, string>> = { en, zh }

let current: Locale = 'en'

export function getLocale(): Locale {
  return current
}

export function setLocale(l: Locale): void {
  current = l
}

/** Translate a UI string, substituting `{name}` placeholders from vars.
 *  When `vars.n === 1` and the locale carries a `<key>.one` variant, the
 *  singular form wins (Chinese duplicates the base value, so it is inert). */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const dict = dicts[current]
  let s: string = dict[key]
  if (vars && vars.n === 1) {
    const one = dict[(key + '.one') as StringKey]
    if (one) s = one
  }
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]))
  }
  return s
}

/** Exported for the dictionary-parity test. */
export const DICTS = dicts
