/**
 * dsh-sseye — Client half (web composition module).
 *
 * DevTools-style viewer for the Host half's captures: a trigger button in
 * `conversation.session.header.utilities` plus a right-side overlay panel in
 * `shell.overlay`. Talks to the Host over same-origin HTTP routes under
 * `/__sseye` (composition plugins have no package-private RPC).
 *
 * The bundle contract (single CJS file, ModuleLoader wrapper, platform
 * externals via the injected require) is owned by tsdown.config.ts.
 */
import * as React from 'react'
import { CSS } from './styles.js'

const h = React.createElement

/* ------------------------------------------------------------------ */
/* Host HTTP API                                                       */
/* ------------------------------------------------------------------ */

const API_BASE = '/__sseye'

async function api(path: string, body?: unknown): Promise<any> {
  const init: RequestInit = body !== undefined
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' }
  const res = await fetch(API_BASE + path, init)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

/* ------------------------------------------------------------------ */

interface SlotsService {
  inject(name: string, cb: () => void): void
  register(options: Record<string, unknown>, render: (props: any) => React.ReactNode): unknown
}

interface ClientContext {
  get(name: string): unknown
  effect(fn: () => unknown, label?: string): unknown
}

const store = {
  open: false,
  items: [] as any[],
  selectedId: null as string | null,
  detail: null as any,
  policy: null as any,
  showPolicy: false,
  openGroups: {} as Record<string, boolean>,
  sessionId: null as string | null,
  onlyThisSession: true,
  listeners: new Set<() => void>(),
  emit() {
    for (const f of Array.from(this.listeners)) { try { f() } catch {} }
  },
}

function fmtTime(ts: number): string {
  try { return new Date(ts).toLocaleTimeString() } catch { return '' }
}
function fmtDur(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return ''
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(1) + 's'
}
function usageText(u: any): string {
  if (!u || typeof u !== 'object') return ''
  const parts: string[] = []
  for (const k of ['inputTokens', 'outputTokens', 'cacheReadTokens']) {
    if (typeof u[k] === 'number') parts.push(k.replace('Tokens', '') + ':' + u[k])
  }
  return parts.join(' ')
}
function cap(s: unknown, n: number): string {
  if (typeof s !== 'string') return ''
  return s.length > n ? s.slice(0, n) + '\n…[截断，共 ' + s.length + ' 字符]' : s
}
function tryParse(s: unknown): { ok: boolean; value?: any } {
  if (typeof s !== 'string') return { ok: false }
  try { return { ok: true, value: JSON.parse(s) } } catch { return { ok: false } }
}
function safeStringify(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

function copyText(text: string, done: () => void): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done))
      return
    }
  } catch {}
  fallbackCopy(text, done)
}
function fallbackCopy(text: string, done: () => void): void {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  } catch {}
  done()
}

function CopyIcon() {
  return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }),
    h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }))
}
function CheckIcon() {
  return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M20 6L9 17l-5-5' }))
}

function CopyWrap(props: { text: string; children?: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false)
  return h('div', { className: 'sseye-copywrap' },
    props.children,
    h('button', {
      className: 'sseye-copy' + (copied ? ' ok' : ''),
      title: '复制',
      onClick: (e: Event) => {
        e.stopPropagation()
        copyText(props.text, () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1000)
        })
      },
    }, copied ? h(CheckIcon) : h(CopyIcon)))
}

function copyablePre(text: string, cls: string) {
  return h(CopyWrap, { text }, h('pre', { className: cls }, text))
}
function copyableJson(value: unknown) {
  return h(CopyWrap, { text: safeStringify(value) }, h(JsonView, { value }))
}

function jp(s: string) { return h('span', { className: 'sseye-jp' }, s) }

function jsonNode(v: any, ind: number, key: string): React.ReactNode {
  const padIn = '  '.repeat(ind + 1)
  const pad = '  '.repeat(ind)
  if (v === null || v === undefined) return h('span', { key, className: 'sseye-jbool' }, 'null')
  if (typeof v === 'boolean') return h('span', { key, className: 'sseye-jbool' }, String(v))
  if (typeof v === 'number') return h('span', { key, className: 'sseye-jnum' }, String(v))
  if (typeof v === 'string') {
    const s = v.length > 4000 ? v.slice(0, 4000) + '…[+' + (v.length - 4000) + ' 字符]' : v
    return h('span', { key, className: 'sseye-jstr' }, '"' + s + '"')
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return h('span', { key, className: 'sseye-jp' }, '[]')
    const kids: React.ReactNode[] = [jp('[\n')]
    v.forEach((item, i) => {
      kids.push(h('span', { key: 'i' + i }, [padIn, jsonNode(item, ind + 1, 'v'), i < v.length - 1 ? ',\n' : '\n']))
    })
    kids.push(jp(pad + ']'))
    return h('span', { key }, kids)
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v)
    if (keys.length === 0) return h('span', { key, className: 'sseye-jp' }, '{}')
    const kids: React.ReactNode[] = [jp('{\n')]
    keys.forEach((k2, i) => {
      kids.push(h('span', { key: 'k' + i }, [padIn, h('span', { className: 'sseye-jkey' }, '"' + k2 + '"'), jp(': '), jsonNode(v[k2], ind + 1, 'v'), i < keys.length - 1 ? ',\n' : '\n']))
    })
    kids.push(jp(pad + '}'))
    return h('span', { key }, kids)
  }
  return h('span', { key, className: 'sseye-jp' }, String(v))
}

function JsonView(props: { value: unknown }) {
  return h('pre', { className: 'sseye-pre' }, jsonNode(props.value, 0, 'root'))
}

function BlockContent(props: { b: any }) {
  const b = props.b
  if (!b || typeof b !== 'object') return copyablePre(cap(String(b), 20000), 'sseye-pre')
  const t = b.type
  if (t === 'text' && typeof b.text === 'string') return copyablePre(cap(b.text, 20000), 'sseye-pre')
  if (t === 'reasoning') {
    const txt = typeof b.reasoning === 'string' ? b.reasoning : (typeof b.text === 'string' ? b.text : '')
    return copyablePre(cap(txt, 20000), 'sseye-pre sseye-reason')
  }
  if (t === 'tool-call' || t === 'tool_call') {
    const args = typeof b.arguments === 'string' ? tryParse(b.arguments) : { ok: b.arguments !== undefined, value: b.arguments }
    return h('div', { className: 'sseye-msg' },
      h('span', { className: 'sseye-chip' }, 'tool-call ' + (b.name || '')),
      args.ok ? copyableJson(args.value) : copyablePre(cap(String(b.arguments || ''), 20000), 'sseye-pre'))
  }
  if (t === 'tool-result' || t === 'tool_result' || t === 'toolResult') {
    const kids: React.ReactNode[] = [h('div', { key: 'h' },
      h('span', { className: 'sseye-chip' }, 'tool-result' + (b.toolCallId ? ' ' + String(b.toolCallId) : '')),
      b.isError ? h('span', { className: 'sseye-chip sseye-err' }, 'error') : null)]
    if (Array.isArray(b.content)) {
      for (let i = 0; i < b.content.length; i++) kids.push(h(BlockContent, { key: 'c' + i, b: b.content[i] }))
    } else if (b.content !== undefined) {
      kids.push(h(CopyWrap, { key: 'c', text: safeStringify(b.content) }, h(JsonView, { value: b.content })))
    }
    return h('div', null, kids)
  }
  if (t === 'image') return h('div', { className: 'sseye-dim' }, '[image 已省略]')
  return copyableJson(b)
}

function logErr(where: string) {
  return (e: any) => { try { console.error('[sseye] ' + where + ' failed:', e && e.message ? e.message : String(e)) } catch {} }
}

function pull(): void {
  api('/list').then((items: any[]) => {
    const arr = Array.isArray(items) ? items : []
    let sig = String(arr.length)
    for (const it of arr) sig += '|' + it.id + ':' + it.status + ':' + it.chunks
    if (sig !== lastSig) {
      lastSig = sig
      store.items = arr
      store.emit()
    }
  }).catch(logErr('list'))
  if (store.selectedId) {
    const cur = store.detail
    if (!cur || cur.id !== store.selectedId || cur.status === 'running') {
      api('/get?id=' + encodeURIComponent(store.selectedId)).then((d) => {
        if (d && d.id === store.selectedId) {
          store.detail = d
          store.emit()
        }
      }).catch(logErr('get'))
    }
  }
}
let lastSig = ''

function setPolicy(patch: unknown): void {
  api('/policy', patch).then((p) => {
    if (p) store.policy = p
    store.emit()
  }).catch(logErr('set-policy'))
}

function dot(status: string) {
  const color = status === 'finished' ? 'var(--dsw-alias-state-success-primary,#34c98e)' : status === 'error' ? 'var(--dsw-alias-state-error-primary,#e5534b)' : 'var(--dsw-alias-state-warn-primary,#f0b429)'
  return h('span', { className: 'sseye-dot', style: { background: color } })
}

function TriggerIcon(props: { size?: number }) {
  const size = props && props.size ? props.size : 20
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
    h('circle', { cx: 12, cy: 12, r: 2.1, fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: 12, cy: 12, r: 6 }),
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('path', { d: 'M12 12 L19.5 6.5' }))
}

function Chevron(props: { open: boolean }) {
  return h('span', { className: 'sseye-chev' + (props.open ? ' open' : '') }, '›')
}

interface Group {
  key: string
  kind: 'turn' | 'other'
  turn?: number
  sessionId?: string
  source?: string
  rows: any[]
  latest: number
}

function groupItems(items: any[]): Group[] {
  const groups: Group[] = []
  const byKey = new Map<string, Group>()
  for (const it of items) {
    let key: string, kind: 'turn' | 'other'
    if (it.turn !== undefined && it.turn !== null) { key = 'T:' + (it.sessionId || '?') + ':' + it.turn; kind = 'turn' }
    else { key = 'O:' + (it.source || 'other') + ':' + (it.sessionId || '?'); kind = 'other' }
    let g = byKey.get(key)
    if (!g) { g = { key, kind, turn: it.turn, sessionId: it.sessionId, source: it.source, rows: [], latest: 0 }; byKey.set(key, g); groups.push(g) }
    g.rows.push(it)
    if (it.startedAt > g.latest) g.latest = it.startedAt
  }
  groups.sort((a, b) => b.latest - a.latest)
  for (const g of groups) g.rows.sort((a, b) => a.startedAt - b.startedAt)
  return groups
}

function StepRow(props: { it: any; onSelect: () => void }) {
  const it = props.it
  const cls = store.selectedId === it.id ? 'sseye-row sel' : 'sseye-row'
  const kids: React.ReactNode[] = [
    dot(it.status),
    h('span', { key: 's', className: 'sseye-stepchip' }, it.step !== undefined && it.step !== null ? 'S' + it.step : (it.source || '')),
  ]
  kids.push(h('span', { key: 't', className: 'sseye-dim' }, fmtTime(it.startedAt)))
  kids.push(h('span', { key: 'p', className: 'sseye-prev' }, it.replyPreview || it.preview || ''))
  if (it.ttftMs !== undefined) kids.push(h('span', { key: 'ttft', className: 'sseye-dim' }, 'TTFT ' + fmtDur(it.ttftMs)))
  kids.push(h('span', { key: 'd', className: 'sseye-dim' }, fmtDur(it.durationMs)))
  if (it.usage) kids.push(h('span', { key: 'u', className: 'sseye-dim' }, usageText(it.usage)))
  return h('div', { className: cls, onClick: props.onSelect }, kids)
}

function TurnGroup(props: { g: Group }) {
  const g = props.g
  const isOpen = store.openGroups[g.key] !== false
  let inTok = 0, outTok = 0, dur = 0, running = 0
  for (const r of g.rows) {
    if (r.usage) {
      if (typeof r.usage.inputTokens === 'number') inTok += r.usage.inputTokens
      if (typeof r.usage.outputTokens === 'number') outTok += r.usage.outputTokens
    }
    if (r.durationMs) dur += r.durationMs
    if (r.status === 'running') running++
  }
  const title = g.kind === 'turn' ? 'Turn ' + g.turn : (g.source === 'compaction' ? 'Compaction' : g.source === 'title' ? '会话标题' : '其他调用')
  const prev = g.rows.length && g.rows[0].preview ? g.rows[0].preview : ''
  return h('div', { className: 'sseye-tgroup' },
    h('div', {
      className: 'sseye-tgh',
      onClick: () => { store.openGroups[g.key] = !isOpen; store.emit() },
    },
      h(Chevron, { open: isOpen }),
      h('span', { className: 'sseye-tgh-title' }, title),
      h('span', { className: 'sseye-chip' }, g.rows.length + ' 次调用' + (running ? ' · ' + running + ' 进行中' : '')),
      h('span', { className: 'sseye-tgh-prev' }, prev),
      h('span', { className: 'sseye-tgh-agg' }, 'in:' + inTok + ' out:' + outTok + ' · ' + fmtDur(dur))),
    isOpen ? h('div', { className: 'sseye-steps' }, g.rows.map((it) => h(StepRow, {
      key: it.id, it,
      onSelect: () => {
        store.selectedId = it.id
        store.detail = null
        store.emit()
        api('/get?id=' + encodeURIComponent(it.id)).then((d) => { if (d) store.detail = d; store.emit() }).catch(logErr('get:select'))
      },
    }))) : null)
}

function Section(props: { title: React.ReactNode; defaultOpen?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(!!props.defaultOpen)
  return h('div', { className: 'sseye-sec' },
    h('div', { className: 'sseye-sec-title', onClick: () => setOpen(!open) }, h(Chevron, { open }), props.title),
    open ? props.children : null)
}

function MessageView(props: { m: any; isNew?: boolean }) {
  const m = props.m
  const role = m && typeof m.role === 'string' ? m.role : 'unknown'
  let body: React.ReactNode = null
  const c = m ? m.content : undefined
  if (typeof c === 'string') body = copyablePre(cap(c, 20000), 'sseye-pre')
  else if (Array.isArray(c)) body = c.map((b, i) => h(BlockContent, { key: i, b }))
  else if (c !== undefined) body = copyableJson(c)
  else if (m && typeof m === 'object') {
    const rest: Record<string, unknown> = {}
    let has = false
    for (const k of Object.keys(m)) { if (k !== 'role') { rest[k] = m[k]; has = true } }
    if (has) body = copyableJson(rest)
  }
  return h('div', { className: 'sseye-msg' + (props.isNew ? ' sseye-msg-new' : '') },
    h('span', { className: 'sseye-chip' }, role), body)
}

function BlockView(props: { b: any }) {
  const b = props.b
  const label = '#' + b.index + ' ' + b.kind + (b.toolName ? ' ' + b.toolName : '') + ' · ' + b.chars + ' chars'
  let body: React.ReactNode = null
  if (b.kind === 'reasoning' && b.reasoning) body = copyablePre(cap(b.reasoning, 20000), 'sseye-pre sseye-reason')
  else if (b.kind === 'tool-call') {
    const args = tryParse(b.args)
    body = args.ok ? copyableJson(args.value) : copyablePre(cap(b.args, 20000), 'sseye-pre')
  } else if (b.text) body = copyablePre(cap(b.text, 20000), 'sseye-pre')
  return h('div', { className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, label), body)
}

function Detail() {
  const d = store.detail
  if (!d) return h('div', { className: 'sseye-detail' }, h('div', { className: 'sseye-empty' }, '加载中…'))
  const req = d.request || {}
  const kids: React.ReactNode[] = []
  const meta: React.ReactNode[] = []
  meta.push(h('span', { key: 'st', className: 'sseye-chip' }, d.status || ''))
  if (d.source) meta.push(h('span', { key: 'so', className: 'sseye-chip' }, d.source))
  if (d.protocol) meta.push(h('span', { key: 'pr', className: 'sseye-chip', title: d.api ? d.api + (d.protocolGuessed ? '（按 provider 猜测）' : '（来自 provider 配置）') : undefined }, (d.protocolGuessed ? '~' : '') + d.protocol))
  if (d.turn !== undefined && d.turn !== null) meta.push(h('span', { key: 'ts', className: 'sseye-chip' }, 'T' + d.turn + ' · S' + d.step))
  if (d.ttftMs !== undefined) meta.push(h('span', { key: 'tt', className: 'sseye-chip' }, 'TTFT ' + fmtDur(d.ttftMs)))
  if (d.durationMs !== undefined) meta.push(h('span', { key: 'du', className: 'sseye-chip' }, '总时长 ' + fmtDur(d.durationMs)))
  meta.push(h('span', { key: 'ch', className: 'sseye-chip' }, d.chunks + ' chunks'))
  kids.push(h('div', { key: 'meta', className: 'sseye-sec' }, meta))

  if (d.error) kids.push(h('div', { key: 'err', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title sseye-err' }, '错误'), copyablePre(String(d.error), 'sseye-pre sseye-err')))
  if (d.usage) kids.push(h('div', { key: 'us', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Usage'), copyableJson(d.usage)))

  kids.push(h('div', { key: 'rq', className: 'sseye-sec' },
    h('div', { className: 'sseye-sec-title' }, '请求 · ' + String(req.provider || '') + '/' + String(req.model || '')),
    d.baseURL !== undefined ? h('span', { className: 'sseye-chip', title: 'endpoint' }, String(d.baseURL)) : null,
    req.reasoningEffort !== undefined ? h('span', { className: 'sseye-chip' }, 'effort ' + String(req.reasoningEffort)) : null,
    req.temperature !== undefined ? h('span', { className: 'sseye-chip' }, 'temp ' + String(req.temperature)) : null,
    req.maxTokens !== undefined ? h('span', { className: 'sseye-chip' }, 'max ' + String(req.maxTokens)) : null))

  if (typeof req.system === 'string' && req.system) {
    kids.push(h(Section, { key: 'sys', title: 'System Prompt（' + req.system.length + ' 字符）' },
      copyablePre(cap(req.system, 30000), 'sseye-pre')))
  } else if (req.systemOmitted) {
    kids.push(h('div', { key: 'sys', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'System Prompt（按策略未捕获）')))
  }

  if (Array.isArray(req.messages)) {
    const shared = typeof d.sharedPrefix === 'number' ? d.sharedPrefix : 0
    const newCount = req.messages.length - shared
    const DIRECT_TAIL = 30
    const msgKids: React.ReactNode[] = [h('div', { key: 'h', className: 'sseye-sec-title' }, 'Messages（共 ' + req.messages.length + ' 条' + (shared > 0 ? ' · 与前序共享 ' + shared + ' 条' : '') + (shared > 0 ? ' · 新增 ' + newCount + ' 条' : '') + '）')]
    if (shared > 0) {
      msgKids.push(h(Section, { key: 'shared', title: '与前一次调用共享的前 ' + shared + ' 条消息（点击展开）' },
        req.messages.slice(0, shared).map((m: any, i: number) => h(MessageView, { key: i, m }))))
    }
    const tail = req.messages.slice(shared)
    const folded = tail.length > DIRECT_TAIL ? tail.length - DIRECT_TAIL : 0
    if (folded > 0) {
      msgKids.push(h(Section, { key: 'older', title: '更早的 ' + folded + ' 条消息（点击展开）' },
        tail.slice(0, folded).map((m: any, i: number) => h(MessageView, { key: 'o' + i, m }))))
    }
    tail.slice(folded).forEach((m: any, i: number) => {
      msgKids.push(h(MessageView, { key: 'n' + i, m, isNew: shared > 0 && folded === 0 }))
    })
    kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, msgKids))
  } else if (req.messagesOmitted) {
    kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Messages（' + req.messagesOmitted + ' 条，按策略未捕获）')))
  }

  if (Array.isArray(req.tools)) {
    const names = req.tools.map((t: any) => t && t.name)
    kids.push(h(Section, { key: 'tls', title: 'Tools（' + req.tools.length + ' 个）' },
      copyableJson(names)))
  }

  if (d.wire && (!d.api || d.api === 'openai-completions')) {
    kids.push(h(Section, { key: 'wire', title: 'Wire JSON（重建，近似）' },
      copyablePre(cap(safeStringify(d.wire), 40000), 'sseye-pre')))
  }

  if (Array.isArray(d.blocks) && d.blocks.length > 0) {
    kids.push(h('div', { key: 'resp', className: 'sseye-sec' },
      h('div', { className: 'sseye-sec-title' }, '响应 · ' + d.blocks.length + ' 个块'),
      d.blocks.map((b: any) => h(BlockView, { key: b.index, b }))))
  }
  if (d.finishReason !== undefined) {
    kids.push(h('div', { key: 'fin', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Finish'), copyableJson(d.finishReason)))
  }
  return h('div', { className: 'sseye-detail' }, kids)
}

function PolicyPanel() {
  const p = store.policy
  if (!p) return null
  const srcLabels: [string, string][] = [['agent', 'Agent 调用'], ['compaction', 'Compaction'], ['title', '会话标题'], ['other', '其他/重放']]
  const fldLabels: [string, string][] = [['system', 'system'], ['messages', 'messages'], ['tools', 'tools'], ['reasoning', 'reasoning'], ['text', '正文'], ['toolArgs', '工具参数']]
  return h('div', { className: 'sseye-policy' },
    h('div', null, '来源：', srcLabels.map((kv) =>
      h('label', { key: kv[0] }, h('input', {
        type: 'checkbox', checked: !!(p.sources && p.sources[kv[0]]),
        onChange: (e: any) => {
          const patch = { sources: {} as Record<string, boolean> }
          patch.sources[kv[0]] = e.target.checked
          if (store.policy && store.policy.sources) store.policy.sources[kv[0]] = e.target.checked
          setPolicy(patch)
        },
      }), kv[1]))),
    h('div', { style: { marginTop: '6px' } }, '字段：', fldLabels.map((kv) =>
      h('label', { key: kv[0] }, h('input', {
        type: 'checkbox', checked: !!(p.fields && p.fields[kv[0]]),
        onChange: (e: any) => {
          const patch = { fields: {} as Record<string, boolean> }
          patch.fields[kv[0]] = e.target.checked
          if (store.policy && store.policy.fields) store.policy.fields[kv[0]] = e.target.checked
          setPolicy(patch)
        },
      }), kv[1]))),
    h('textarea', {
      className: 'sseye-textarea', rows: 2,
      placeholder: '脱敏正则，每行一条；命中替换为 ***（失焦生效）',
      defaultValue: (p.redactions || []).join('\n'),
      onBlur: (e: any) => {
        const lines = String(e.target.value || '').split('\n').map((s: string) => s.trim()).filter(Boolean)
        setPolicy({ redactions: lines })
      },
    }))
}

function Panel() {
  const [, force] = React.useState(0)
  React.useEffect(() => {
    const f = () => force((n) => n + 1)
    store.listeners.add(f)
    return () => { store.listeners.delete(f) }
  }, [])
  React.useEffect(() => {
    if (!store.open) return undefined
    let dead = false
    const tick = () => { if (!dead) pull() }
    tick()
    const timer = setInterval(tick, 1500)
    return () => { dead = true; clearInterval(timer) }
  }, [store.open])
  if (!store.open) return null
  const all = store.items
  const items = (store.onlyThisSession && store.sessionId) ? all.filter((it) => it.sessionId === store.sessionId) : all
  const groups = groupItems(items)
  return h('div', { className: 'sseye-panel' },
    h('div', { className: 'sseye-head' },
      h('span', { className: 'sseye-title' }, 'SSEye'),
      h('span', { className: 'sseye-count' }, groups.length + ' 轮 · ' + items.length + ' 次调用'),
      h('button', {
        className: 'sseye-btn',
        'data-active': store.onlyThisSession ? '' : undefined,
        onClick: () => { store.onlyThisSession = !store.onlyThisSession; store.emit() },
      }, store.onlyThisSession ? '本会话' : '全部'),
      h('span', { className: 'sseye-spacer' }),
      h('button', {
        className: 'sseye-btn',
        onClick: () => {
          store.showPolicy = !store.showPolicy
          if (store.showPolicy && !store.policy) {
            api('/policy').then((p) => { if (p) store.policy = p; store.emit() }).catch(logErr('get-policy'))
          }
          store.emit()
        },
      }, store.showPolicy ? '收起策略' : '抓取策略'),
      h('button', {
        className: 'sseye-btn',
        onClick: () => {
          api('/clear', {}).then(() => { store.items = []; store.selectedId = null; store.detail = null; store.emit() }).catch(logErr('clear'))
        },
      }, '清空'),
      h('button', {
        className: 'sseye-btn',
        onClick: () => { store.open = false; store.emit() },
      }, '关闭')),
    store.showPolicy ? h(PolicyPanel) : null,
    h('div', { className: 'sseye-body' },
      h('div', { className: 'sseye-listcol' },
        groups.length === 0
          ? h('div', { className: 'sseye-empty' }, '暂无捕获。发起一次对话或调用后此处出现记录。')
          : groups.map((g) => h(TurnGroup, { key: g.key, g }))),
      store.selectedId ? h(Detail) : null))
}

/* ------------------------------------------------------------------ */

export const name = 'dsh-sseye'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots') as SlotsService | undefined
  if (slots === undefined) return

  // Composition clients have no `styles` builtin: own the <style> tag on the fiber.
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-sseye'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'dsh-sseye: panel styles')

  slots.inject('conversation.session.header.utilities', () => slots.register(
    { name: 'conversation.session.header.utilities', id: 'sseye-trigger', label: 'SSEye' },
    (props: any) => {
      if (props && props.sessionId) store.sessionId = String(props.sessionId)
      return h('button', {
        className: 'sseye-hbtn',
        'data-active': store.open ? '' : undefined,
        title: 'SSEye · LLM 调试台',
        onClick: () => { store.open = !store.open; store.emit() },
      }, h(TriggerIcon, { size: 15 }), 'SSEye')
    },
  ))

  slots.inject('shell.overlay', () => slots.register(
    { name: 'shell.overlay', id: 'sseye-panel', label: 'SSEye' },
    () => h(Panel),
  ))
}
