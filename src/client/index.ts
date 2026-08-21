/**
 * dsh-sseye — Client half (web composition module).
 *
 * DevTools-style viewer for the Host half's captures: a trigger button in
 * `conversation.session.header.utilities` plus the shell's right `details`
 * column (grid sibling of the conversation with a shell-owned draggable
 * divider). Talks to the Host over same-origin HTTP routes under
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

interface LayoutService {
  openDetails(): void
  closeDetails(): void
}

interface ClientContext {
  get(name: string): unknown
  effect(fn: () => unknown, label?: string): unknown
}

/** Assigned in apply(); module-level because the components are module-level. */
let layout: LayoutService | undefined

const store = {
  open: false,  items: [] as any[],
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
function DownloadIcon() {
  return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M12 3v11' }),
    h('path', { d: 'M7 10l5 5 5-5' }),
    h('path', { d: 'M4 19h16' }))
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

/**
 * Per-container child cap for rendered JSON trees. A large tool-call payload
 * (a file write, a huge array) otherwise materializes thousands of spans in
 * one synchronous render and freezes the whole page — the cap bounds that;
 * the overflow stays one click away and the full value is always on the
 * copy button.
 */
const JSON_CHILD_CAP = 80

/** Collapsed remainder of a capped array/object; expands in place on click. */
function MoreJson(props: { v: any; keys: string[] | null; ind: number }) {
  const [open, setOpen] = React.useState(false)
  const v = props.v
  const keys = props.keys
  const ind = props.ind
  const total = keys ? keys.length : v.length
  if (!open) {
    return h('button', {
      className: 'sseye-jmore',
      onClick: () => setOpen(true),
    }, '… 展开 ' + (total - JSON_CHILD_CAP) + ' 项（共 ' + total + '，完整内容可复制）')
  }
  const padIn = '  '.repeat(ind + 1)
  const kids: React.ReactNode[] = []
  if (keys) {
    const rest = keys.slice(JSON_CHILD_CAP)
    rest.forEach((k2, i) => {
      kids.push(h('span', { key: 'k' + i }, [padIn, h('span', { className: 'sseye-jkey' }, '"' + k2 + '"'), jp(': '), jsonNode(v[k2], ind + 1, 'v'), i < rest.length - 1 ? ',\n' : '\n']))
    })
  } else {
    const rest = v.slice(JSON_CHILD_CAP)
    rest.forEach((item, i) => {
      kids.push(h('span', { key: 'i' + i }, [padIn, jsonNode(item, ind + 1, 'v'), i < rest.length - 1 ? ',\n' : '\n']))
    })
  }
  return h('span', null, kids)
}

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
    const capped = v.length > JSON_CHILD_CAP
    const shown = capped ? v.slice(0, JSON_CHILD_CAP) : v
    const kids: React.ReactNode[] = [jp('[\n')]
    shown.forEach((item, i) => {
      kids.push(h('span', { key: 'i' + i }, [padIn, jsonNode(item, ind + 1, 'v'), (i < shown.length - 1 || capped) ? ',\n' : '\n']))
    })
    if (capped) kids.push(h(MoreJson, { key: 'more', v, keys: null, ind }))
    kids.push(jp(pad + ']'))
    return h('span', { key }, kids)
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v)
    if (keys.length === 0) return h('span', { key, className: 'sseye-jp' }, '{}')
    const capped = keys.length > JSON_CHILD_CAP
    const shown = capped ? keys.slice(0, JSON_CHILD_CAP) : keys
    const kids: React.ReactNode[] = [jp('{\n')]
    shown.forEach((k2, i) => {
      kids.push(h('span', { key: 'k' + i }, [padIn, h('span', { className: 'sseye-jkey' }, '"' + k2 + '"'), jp(': '), jsonNode(v[k2], ind + 1, 'v'), (i < shown.length - 1 || capped) ? ',\n' : '\n']))
    })
    if (capped) kids.push(h(MoreJson, { key: 'more', v, keys, ind }))
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

/**
 * Browser-native download through the host /export route: the route answers
 * with `content-disposition: attachment`, so a plain anchor click saves the
 * file — no Blob / URL.createObjectURL needed.
 */
function download(path: string): void {
  try {
    const a = document.createElement('a')
    a.href = path
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (e) { logErr('download')(e) }
}

/** Download filename stem: turn/step coordinates when known, else source. */
function exportNameOf(it: any): string {
  const id = String(it && it.id ? it.id : 'call')
  if (it && it.turn !== undefined && it.turn !== null) {
    return 'T' + it.turn + (it.step !== undefined && it.step !== null ? '-S' + it.step : '') + '-' + id
  }
  return String(it && it.source ? it.source : 'call') + '-' + id
}

function exportUrl(ids: string, name: string): string {
  return API_BASE + '/export?ids=' + encodeURIComponent(ids) + '&name=' + encodeURIComponent(name)
}

/**
 * Fields a live /get merges into an open detail. Everything request-side
 * (request/wire/sharedPrefix) is immutable per record and stays untouched.
 */
const LIVE_KEYS = ['status', 'chunks', 'ttftMs', 'durationMs', 'usage', 'finishReason', 'error', 'blocks']

/**
 * One polling round: /list (signature-guarded) plus, when the open detail is
 * a running record, a live /get that merges only the streaming fields into
 * the existing detail object. The full multi-megabyte /get is fetched once
 * per selection (see toggleStep) and once more when the record settles —
 * never per tick.
 */
function pull(): Promise<void> {
  const jobs: Promise<unknown>[] = [api('/list').then((items: any[]) => {
    const arr = Array.isArray(items) ? items : []
    // The signature deliberately excludes per-chunk counters: a streaming
    // record must not re-parse and re-render the whole list on every tick.
    // Every included field changes only at bounded moments (status flips,
    // first-chunk TTFT, finish duration, the first 80 chars of preview).
    let sig = String(arr.length)
    for (const it of arr) sig += '|' + it.id + ':' + it.status + ':' + (it.ttftMs || 0) + ':' + (it.durationMs || 0) + ':' + (it.preview || '') + ':' + (it.replyPreview || '')
    if (sig !== lastSig) {
      lastSig = sig
      store.items = arr
      store.emit()
    }
  }).catch(logErr('list'))]
  const cur = store.detail
  if (store.selectedId && cur && cur.id === store.selectedId && cur.status === 'running') {
    jobs.push(api('/get?live=1&id=' + encodeURIComponent(store.selectedId)).then((live: any) => {
      // The selection may have changed while the request was in flight.
      if (!live || live.id !== cur.id || store.detail !== cur) return
      for (const k of LIVE_KEYS) {
        if (live[k] !== undefined) (cur as Record<string, unknown>)[k] = live[k]
      }
      store.emit()
      if (cur.status !== 'running') {
        // Settled between ticks: one final full fetch so the settled view
        // (final usage, finish reason, exact duration) is not the stale
        // mid-stream snapshot the last live tick captured.
        api('/get?id=' + encodeURIComponent(cur.id)).then((d: any) => {
          if (d && d.id === store.selectedId && store.detail === cur) { store.detail = d; store.emit() }
        }).catch(logErr('get:final'))
      }
    }).catch(logErr('get:live')))
  }
  return Promise.all(jobs).then(() => undefined)
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
  // Display priority: the content preview wins over the right-side metrics.
  // styles.ts carries container queries that progressively hide usage → TTFT →
  // time as the list column narrows; duration stays visible the longest.
  kids.push(h('span', { key: 't', className: 'sseye-dim sseye-time' }, fmtTime(it.startedAt)))
  kids.push(h('span', { key: 'p', className: 'sseye-prev' }, it.replyPreview || it.preview || ''))
  if (it.ttftMs !== undefined) kids.push(h('span', { key: 'ttft', className: 'sseye-dim sseye-ttft' }, 'TTFT ' + fmtDur(it.ttftMs)))
  kids.push(h('span', { key: 'd', className: 'sseye-dim sseye-dur' }, fmtDur(it.durationMs)))
  if (it.usage) kids.push(h('span', { key: 'u', className: 'sseye-dim sseye-u' }, usageText(it.usage)))
  kids.push(h('button', {
    key: 'dl',
    className: 'sseye-dl',
    title: '下载该调用（JSON）',
    onClick: (e: Event) => {
      e.stopPropagation()
      download(exportUrl(it.id, exportNameOf(it)))
    },
  }, h(DownloadIcon)))
  return h('div', { className: cls, onClick: props.onSelect }, kids)
}

/** Toggle the inline detail of one step row (accordion: one expanded at a time). */
function toggleStep(id: string): void {
  if (store.selectedId === id) {
    store.selectedId = null
    store.detail = null
  } else {
    store.selectedId = id
    store.detail = null
    api('/get?id=' + encodeURIComponent(id)).then((d) => {
      if (d && store.selectedId === d.id) { store.detail = d; store.emit() }
    }).catch(logErr('get:select'))
  }
  store.emit()
}

/** Step rows with the expanded step's detail interleaved right below its row. */
function stepRows(g: Group): React.ReactNode[] {
  const out: React.ReactNode[] = []
  for (const it of g.rows) {
    out.push(h(StepRow, { key: it.id, it, onSelect: () => toggleStep(it.id) }))
    if (store.selectedId === it.id) out.push(h(InlineDetail, { key: it.id + ':d' }))
  }
  return out
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
      h('span', { className: 'sseye-tgh-agg' }, 'in:' + inTok + ' out:' + outTok + ' · ' + fmtDur(dur)),
      h('button', {
        className: 'sseye-dl',
        title: '下载本组全部调用（JSON）',
        onClick: (e: Event) => {
          e.stopPropagation()
          const ids = g.rows.map((r) => r.id).join(',')
          const gname = g.kind === 'turn' ? 'turn-' + g.turn : String(g.source || 'group')
          download(exportUrl(ids, gname))
        },
      }, h(DownloadIcon))),
    isOpen ? h('div', { className: 'sseye-steps' }, stepRows(g)) : null)
}

function Section(props: { title: React.ReactNode; defaultOpen?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(!!props.defaultOpen)
  return h('div', { className: 'sseye-sec' },
    h('div', { className: 'sseye-sec-title', onClick: () => setOpen(!open) }, h(Chevron, { open }), props.title),
    open ? props.children : null)
}

function msgChars(m: any): number {
  try {
    const c = m ? m.content : undefined
    if (typeof c === 'string') return c.length
    if (c === undefined) return 0
    return JSON.stringify(c).length
  } catch { return 0 }
}

function MessageView(props: { m: any; isNew?: boolean }) {
  const m = props.m
  const role = m && typeof m.role === 'string' ? m.role : 'unknown'
  // The harness role vocabulary is system|user|assistant only — tool results
  // ride in user-role messages as tool-result blocks. A pure tool-result
  // message gets a precise chip so it never reads as human input; the wire
  // layer expands it to a standalone {role:'tool'} message (see wireOf).
  const pureToolResult = role === 'user' && Array.isArray(m.content) && m.content.length > 0
    && m.content.every((b: any) => b && typeof b === 'object' && b.type === 'tool-result')
  const shownRole = pureToolResult ? 'tool-result' : role
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
    h('div', { className: 'sseye-msg-head' },
      h('span', {
        className: 'sseye-role sseye-role-' + (pureToolResult ? 'tool' : role),
        title: pureToolResult ? '规范化层 role=user（工具结果块）；wire 层展开为 role:"tool"' : undefined,
      }, shownRole),
      h('span', { className: 'sseye-dim' }, msgChars(m) + ' 字符')),
    body)
}

const BLOCK_KIND_COLOR: Record<string, string> = {
  text: 'var(--dsw-alias-button-info-fill,#4f8cff)',
  reasoning: '#a371f7',
  'tool-call': 'var(--dsw-alias-state-warn-primary,#f0b429)',
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
  const color = BLOCK_KIND_COLOR[b.kind] || 'var(--dsw-alias-label-secondary,#8b949e)'
  return h('div', { className: 'sseye-sec' },
    h('div', { className: 'sseye-sec-title' }, h('span', { className: 'sseye-bdot', style: { background: color } }), label),
    body)
}

function Stat(props: { label: string; value: string }) {
  return h('div', { className: 'sseye-stat' },
    h('div', { className: 'sseye-stat-l' }, props.label),
    h('div', { className: 'sseye-stat-v' }, props.value))
}

function Hero(props: { d: any }) {
  const d = props.d
  const req = d.request || {}
  const u = d.usage || {}
  const stats: React.ReactNode[] = []
  if (d.ttftMs !== undefined) stats.push(h(Stat, { key: 'ttft', label: 'TTFT', value: fmtDur(d.ttftMs) }))
  if (d.durationMs !== undefined) stats.push(h(Stat, { key: 'dur', label: '总时长', value: fmtDur(d.durationMs) }))
  stats.push(h(Stat, { key: 'ch', label: 'chunks', value: String(d.chunks) }))
  if (typeof u.inputTokens === 'number') stats.push(h(Stat, { key: 'in', label: 'input', value: String(u.inputTokens) }))
  if (typeof u.outputTokens === 'number') stats.push(h(Stat, { key: 'out', label: 'output', value: String(u.outputTokens) }))
  if (typeof u.cacheReadTokens === 'number') stats.push(h(Stat, { key: 'cr', label: 'cache read', value: String(u.cacheReadTokens) }))
  let cacheBar: React.ReactNode = null
  if (typeof u.cacheReadTokens === 'number' && typeof u.inputTokens === 'number' && u.inputTokens + u.cacheReadTokens > 0) {
    const ratio = u.cacheReadTokens / (u.inputTokens + u.cacheReadTokens)
    cacheBar = h('div', { className: 'sseye-cache', title: 'cacheReadTokens / (inputTokens + cacheReadTokens)' },
      h('div', { className: 'sseye-cache-track' }, h('div', { className: 'sseye-cache-fill', style: { width: (ratio * 100).toFixed(1) + '%' } })),
      h('span', { className: 'sseye-cache-label' }, 'cache 命中 ' + (ratio * 100).toFixed(1) + '%'))
  }
  return h('div', { className: 'sseye-hero' },
    h('div', { className: 'sseye-hero-top' },
      dot(d.status),
      h('span', { className: 'sseye-hero-model' }, String(req.provider || '') + '/' + String(req.model || '')),
      d.protocol ? h('span', { className: 'sseye-chip sseye-chip-accent', title: d.api ? d.api + (d.protocolGuessed ? '（按 provider 猜测）' : '（来自 provider 配置）') : undefined }, (d.protocolGuessed ? '~' : '') + d.protocol) : null,
      d.source ? h('span', { className: 'sseye-chip' }, d.source) : null,
      d.turn !== undefined && d.turn !== null ? h('span', { className: 'sseye-chip' }, 'T' + d.turn + ' · S' + d.step) : null,
      h('span', { className: 'sseye-spacer' }),
      h('button', {
        className: 'sseye-btn',
        title: '下载该调用（JSON）',
        onClick: () => download(exportUrl(d.id, exportNameOf(d))),
      }, '下载'),
      h('span', { className: 'sseye-dim' }, fmtTime(d.startedAt))),
    d.baseURL !== undefined ? h('div', { className: 'sseye-hero-ep' }, String(d.baseURL)) : null,
    h('div', { className: 'sseye-stats' }, stats),
    cacheBar)
}

/**
 * Inline expansion of one step row: renders Detail directly under the row,
 * inside the single list scroll flow (no second pane, no second scrollbar).
 * On mount, nudges the scroll just enough to bring the expanded content into
 * view — `nearest` never jumps when the row is already visible.
 */
function InlineDetail() {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (el && typeof el.scrollIntoView === 'function') {
      try { el.scrollIntoView({ block: 'nearest' }) } catch {}
    }
  }, [])
  return h('div', { className: 'sseye-detail', ref }, h(Detail))
}

/**
 * The request-derived half of the detail view: params, system prompt,
 * messages, tools, wire. All of it is immutable per record and multi-megabyte
 * in the worst case, so it is memoized on the detail object identity: live
 * polling mutates the same object in place (see pull), and this subtree —
 * with its 20k-char copy strings and the 40k wire stringify — re-renders only
 * when a different record is selected or the settled full detail replaces it.
 */
const RequestDetail = React.memo(function RequestDetail(props: { d: any }) {
  const d = props.d
  const req = d.request || {}
  const kids: React.ReactNode[] = []

  const params: React.ReactNode[] = []
  if (req.reasoningEffort !== undefined) params.push(h('span', { key: 'ef', className: 'sseye-chip' }, 'effort ' + String(req.reasoningEffort)))
  if (req.temperature !== undefined) params.push(h('span', { key: 'tp', className: 'sseye-chip' }, 'temp ' + String(req.temperature)))
  if (req.maxTokens !== undefined) params.push(h('span', { key: 'mx', className: 'sseye-chip' }, 'max ' + String(req.maxTokens)))
  if (params.length) kids.push(h('div', { key: 'prm', className: 'sseye-sec' }, params))

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

  return h('div', null, kids)
})

function Detail() {
  const d = store.detail
  if (!d) return h('div', { className: 'sseye-empty' }, '加载中…')
  // Dynamic zone: everything that changes while the record streams (hero
  // stats, usage, error, response blocks, finish) — cheap to re-render every
  // live tick. The heavy request half lives in the memoized RequestDetail.
  const kids: React.ReactNode[] = []

  kids.push(h(Hero, { key: 'hero', d }))

  if (d.error) kids.push(h('div', { key: 'err', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title sseye-err' }, '错误'), copyablePre(String(d.error), 'sseye-pre sseye-err')))

  if (d.usage) kids.push(h(Section, { key: 'us', title: 'Usage JSON' }, copyableJson(d.usage)))

  kids.push(h(RequestDetail, { key: 'req', d }))

  if (Array.isArray(d.blocks) && d.blocks.length > 0) {
    kids.push(h('div', { key: 'resp', className: 'sseye-sec' },
      h('div', { className: 'sseye-sec-title' }, '响应 · ' + d.blocks.length + ' 个块'),
      d.blocks.map((b: any) => h(BlockView, { key: b.index, b }))))
  }
  if (d.finishReason !== undefined) {
    kids.push(h('div', { key: 'fin', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Finish'), copyableJson(d.finishReason)))
  }
  return h('div', null, kids)
}

function PolicyPanel() {
  const p = store.policy
  if (!p) return null
  const srcLabels: [string, string][] = [['agent', 'Agent 调用'], ['compaction', 'Compaction'], ['title', '会话标题'], ['other', '其他/重放']]
  const fldLabels: [string, string][] = [['system', 'system'], ['messages', 'messages'], ['tools', 'tools'], ['reasoning', 'reasoning'], ['text', '正文'], ['toolArgs', '工具参数']]
  const lim = p.limits || {}
  // [key, label, min, max, step] — bounds mirror LIMIT_BOUNDS on the host.
  const limLabels: [string, string, number, number, number][] = [
    ['capacity', '缓冲条数', 1, 5000, 10],
    ['maxString', '请求字段截断', 1000, 20000000, 1000],
    ['maxBlock', '响应块截断', 1000, 50000000, 10000],
  ]
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
    h('div', { style: { marginTop: '6px' } }, '容量：', limLabels.map((it) =>
      h('label', { key: it[0], title: '范围 ' + it[2] + ' – ' + it[3] + '，失焦生效' },
        h('span', null, it[1]),
        h('input', {
          type: 'number',
          className: 'sseye-num',
          min: it[2], max: it[3], step: it[4],
          // Remount when the echoed value changes so clamping becomes visible.
          key: it[0] + '-' + (lim[it[0]] || 0),
          defaultValue: lim[it[0]],
          onBlur: (e: any) => {
            const n = Math.round(Number(e.target.value))
            if (!Number.isFinite(n) || n === lim[it[0]]) return
            const patch = { limits: {} as Record<string, number> }
            patch.limits[it[0]] = n
            setPolicy(patch)
          },
        }))),
      h('div', { className: 'sseye-dim', style: { marginTop: '4px' } },
        '截断只作用于之后的捕获内容；调小缓冲条数会立即裁掉最旧的记录')),
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
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const f = () => force((n) => n + 1)
    store.listeners.add(f)
    return () => { store.listeners.delete(f) }
  }, [])
  React.useEffect(() => {
    // The details column is never unmounted by the shell — closing it only
    // collapses it to width 0 — so mount/unmount cannot gate polling. Measure
    // the real rendered width instead: 0 (or a hidden tab) means fully paused,
    // which is what keeps a closed panel at zero requests instead of a
    // forever 1.5s heartbeat. A single self-scheduling loop also means a slow
    // poll can never overlap the next one (setInterval did).
    let dead = false
    let width: number = typeof ResizeObserver === 'undefined' ? Infinity : 0
    let wakeUp: (() => void) | null = null
    const visible = () => width > 1 && !(typeof document !== 'undefined' && document.hidden)
    const sleep = (ms: number) => new Promise<void>((resolve) => {
      const t = setTimeout(() => { wakeUp = null; resolve() }, ms)
      wakeUp = () => { clearTimeout(t); wakeUp = null; resolve() }
    })
    const wake = () => { if (wakeUp) wakeUp() }
    const loop = async () => {
      while (!dead) {
        if (!visible()) { await sleep(500); continue }
        try { await pull() } catch {}
        const busy = store.items.some((it: any) => it.status === 'running')
          || (store.detail != null && store.detail.status === 'running')
        // Poll fast while anything streams, back off when idle.
        await sleep(busy ? 1500 : 4000)
      }
    }
    void loop()
    let ro: ResizeObserver | undefined
    const root = rootRef.current
    if (typeof ResizeObserver !== 'undefined' && root) {
      ro = new ResizeObserver((entries) => {
        const prev = width
        if (entries.length > 0) width = entries[entries.length - 1].contentRect.width
        if (width > 1 && prev <= 1) wake() // column opened: refresh now
      })
      ro.observe(root)
    }
    const onVis = () => { if (!document.hidden) wake() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      dead = true
      wake()
      if (ro) ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  const all = store.items
  const items = (store.onlyThisSession && store.sessionId) ? all.filter((it) => it.sessionId === store.sessionId) : all
  const groups = groupItems(items)
  return h('div', { className: 'sseye-panel', ref: rootRef },
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
        onClick: () => { store.open = false; store.emit(); if (layout) layout.closeDetails() },
      }, '关闭')),
    store.showPolicy ? h(PolicyPanel) : null,
    // Single scroll flow: the list column is the only scrolling region; step
    // details expand inline under their row (see stepRows/InlineDetail).
    h('div', { className: 'sseye-body' },
      h('div', { className: 'sseye-listcol' },
        groups.length === 0
          ? h('div', { className: 'sseye-empty' }, '暂无捕获。发起一次对话或调用后此处出现记录。')
          : groups.map((g) => h(TurnGroup, { key: g.key, g })))))
}

/* ------------------------------------------------------------------ */

export const name = 'dsh-sseye'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots') as SlotsService | undefined
  if (slots === undefined) return
  layout = ctx.get('layout') as LayoutService | undefined

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
        onClick: () => {
          store.open = !store.open
          store.emit()
          if (layout) { if (store.open) layout.openDetails(); else layout.closeDetails() }
        },
      }, h(TriggerIcon, { size: 15 }), 'SSEye')
    },
  ))

  // Dock into the shell's right details column (grid sibling of the
  // conversation, draggable divider owned by the shell) instead of a
  // floating overlay. Trade-off: this shadows the shipped tool-details panel.
  //
  // `details` is a single slot and dsh-client-ui-conversation already occupies
  // it with its DetailsPanel at the default priority 0. Shadowing is a
  // priority contest, not a land grab: entries on one cell coexist at
  // *distinct* priorities sorted ascending, and the lowest live entry renders.
  // Registering at 0 collides with the occupant and throws
  // ("single slot already has a registration at priority 0"), which fails the
  // whole plugin load. -1 sits below the shipped panel, so this renders and
  // the core entry stays live underneath as the fallback.
  slots.inject('details', () => slots.register(
    { name: 'details', priority: -1 },
    (props: any) => {
      if (props && props.sessionId) store.sessionId = String(props.sessionId)
      return h(Panel)
    },
  ))
}
