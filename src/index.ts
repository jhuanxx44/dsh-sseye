/**
 * dsh-sseye — Host half.
 *
 * Taps the `llm/stream` waterfall to capture the full content of every LLM
 * call (complete GenerateOptions + every StreamChunk), correlates calls with
 * `agent/request` turn/step coordinates via shared AbortSignal identity, and
 * serves the captured records to the Client half over local HTTP routes
 * (composition plugins have no package-private RPC; the browser fetches
 * same-origin routes registered on the webServer service).
 *
 * Invariants (see AGENTS.md):
 * - capture at llm/stream, never the wire; chunks tee through unchanged;
 * - captured options arrive deep-frozen — read, never rewrite;
 * - records live in a bounded in-memory ring buffer; nothing persists.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'

const CAPACITY = 100
const MAX_STRING = 200000
const ROUTE_PREFIX = '/__sseye'

interface Policy {
  sources: Record<'agent' | 'compaction' | 'title' | 'other', boolean>
  fields: Record<'system' | 'messages' | 'tools' | 'reasoning' | 'text' | 'toolArgs', boolean>
  redactions: string[]
}

interface CapturedBlock {
  index: number
  kind: string
  text: string
  reasoning: string
  toolName: string
  toolId: string
  args: string
  chars: number
  startedAt: number
  endedAt?: number
}

interface Record_ {
  id: string
  startedAt: number
  firstChunkAt: number
  endedAt: number
  status: 'running' | 'finished' | 'error'
  source: string
  error?: string
  sessionId?: string
  turn?: number
  step?: number
  api?: string
  apiGuessed?: boolean
  baseURL?: string
  usage?: unknown
  finishReason?: unknown
  request: Record<string, unknown>
  blocks: Map<number, CapturedBlock>
  chunkCount: number
}

const records: Record_[] = []
const byId = new Map<string, Record_>()
const coordBySignal = new Map<AbortSignal, { turn?: number; step?: number }>()
let seq = 0

const policy: Policy = {
  sources: { agent: true, compaction: true, title: true, other: true },
  fields: { system: true, messages: true, tools: true, reasoning: true, text: true, toolArgs: true },
  redactions: [],
}

/** Canonical pi-ai Api ids → friendly labels. */
const API_LABELS: Record<string, string> = {
  'openai-completions': 'OpenAI Chat Completions',
  'openai-responses': 'OpenAI Responses',
  'azure-openai-responses': 'Azure OpenAI Responses',
  'openai-codex-responses': 'OpenAI Codex Responses',
  'anthropic-messages': 'Anthropic Messages',
  'google-generative-ai': 'Google Generative AI',
  'google-vertex': 'Google Vertex AI',
  'mistral-conversations': 'Mistral Conversations',
  'bedrock-converse-stream': 'AWS Bedrock ConverseStream',
  'pi-messages': 'Pi Messages',
  'ollama-chat': 'Ollama /api/chat (NDJSON)',
}

/** Last-resort guesses for routes whose adapter exposes no configured protocol. */
const PROVIDER_API_FALLBACK: Record<string, string> = {
  'deepseek-official': 'openai-completions',
  'newapi': 'openai-completions',
  'ollama-cloud': 'ollama-chat',
}

interface RouteInfo { at: number; api?: string; baseURL?: string; guessed?: boolean }

const apiCache = new Map<string, RouteInfo>()
const API_CACHE_TTL = 60000

interface LlmConfigurableProviderEntry {
  provider: string
  settingsNs: unknown
  settingsPath?: readonly string[]
}

interface Svcs {
  llm?: { listConfigurableProviders(): LlmConfigurableProviderEntry[] }
  settings?: { get(ns: unknown): unknown }
}

/**
 * Truth source for the wire protocol: llm.listConfigurableProviders() gives
 * each route's settings namespace + path; the profile object there carries
 * the adapter's `api` (pi-ai KnownApi) and `baseURL`.
 */
function resolveRoute(svcs: Svcs, provider: string): RouteInfo {
  const hit = apiCache.get(provider)
  if (hit && Date.now() - hit.at < API_CACHE_TTL) return hit
  const out: RouteInfo = { at: Date.now() }
  try {
    if (svcs.llm && svcs.settings) {
      const entries = svcs.llm.listConfigurableProviders()
      const entry = Array.isArray(entries) ? entries.find((e) => e && e.provider === provider) : undefined
      if (entry) {
        let node: any = svcs.settings.get(entry.settingsNs)
        const path = Array.isArray(entry.settingsPath) ? entry.settingsPath : []
        for (const p of path) if (node != null) node = node[p]
        if (node && typeof node === 'object') {
          if (typeof node.api === 'string' && node.api) out.api = node.api
          if (typeof node.baseURL === 'string' && node.baseURL) out.baseURL = node.baseURL
        }
      }
    }
  } catch {}
  if (!out.api) {
    const fb = PROVIDER_API_FALLBACK[provider]
    if (fb) { out.api = fb; out.guessed = true }
  }
  apiCache.set(provider, out)
  return out
}

function protocolLabel(api: string): string {
  return API_LABELS[api] || api
}

function sourceOf(options: any): string {
  if (options.purpose === 'compaction') return 'compaction'
  if (options.purpose === 'session-title') return 'title'
  if (options.sessionId !== undefined && options.sessionId !== null) return 'agent'
  return 'other'
}

function capString(s: unknown): unknown {
  if (typeof s !== 'string') return s
  if (s.length <= MAX_STRING) return s
  return s.slice(0, MAX_STRING) + '\n…[truncated, total ' + s.length + ' chars]'
}

function redact(s: unknown): unknown {
  if (typeof s !== 'string' || policy.redactions.length === 0) return s
  let out = s
  for (const src of policy.redactions) {
    try { out = out.replace(new RegExp(src, 'g'), '***') } catch {}
  }
  return out
}

function cloneJson(v: any): any {
  if (v === null || v === undefined) return v === undefined ? null : v
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'string') return capString(redact(v))
  if (Array.isArray(v)) return v.map((x) => x === undefined ? null : cloneJson(x))
  if (typeof v === 'object') {
    if (v.type === 'image') return { type: 'image', omitted: true }
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v)) {
      const val = v[k]
      if (val === undefined || typeof val === 'function') continue
      out[k] = cloneJson(val)
    }
    return out
  }
  return String(v)
}

function copyRequest(options: any): Record<string, unknown> {
  const req: Record<string, unknown> = { provider: options.provider, model: options.model }
  if (options.reasoningEffort !== undefined) req.reasoningEffort = String(options.reasoningEffort)
  if (options.temperature !== undefined) req.temperature = options.temperature
  if (options.maxTokens !== undefined) req.maxTokens = options.maxTokens
  if (options.stop !== undefined) req.stop = cloneJson(options.stop)
  if (typeof options.system === 'string' && options.system.length > 0) {
    if (policy.fields.system) req.system = capString(redact(options.system))
    else req.systemOmitted = true
  }
  const msgs = Array.isArray(options.messages) ? options.messages : []
  req.messageCount = msgs.length
  if (policy.fields.messages) req.messages = msgs.map((m) => cloneJson(m))
  else req.messagesOmitted = msgs.length
  const tools = Array.isArray(options.tools) ? options.tools : []
  req.toolCount = tools.length
  if (policy.fields.tools) req.tools = tools.map((t) => cloneJson(t))
  else req.toolsOmitted = tools.length
  return req
}

function ensureBlock(rec: Record_, index: number, kind: string): CapturedBlock {
  let b = rec.blocks.get(index)
  if (!b) {
    b = { index, kind, text: '', reasoning: '', toolName: '', toolId: '', args: '', chars: 0, startedAt: Date.now() }
    rec.blocks.set(index, b)
  }
  return b
}

function observeChunk(rec: Record_, chunk: any): void {
  try {
    if (!chunk || typeof chunk !== 'object') return
    const now = Date.now()
    if (rec.firstChunkAt === 0) rec.firstChunkAt = now
    rec.chunkCount++
    if (chunk.type === 'block-start') {
      const b = ensureBlock(rec, chunk.index, typeof chunk.blockType === 'string' ? chunk.blockType : 'unknown')
      b.kind = typeof chunk.blockType === 'string' ? chunk.blockType : b.kind
    } else if (chunk.type === 'text-delta') {
      const b = ensureBlock(rec, chunk.index, 'text')
      const t = typeof chunk.text === 'string' ? chunk.text : ''
      b.chars += t.length
      if (policy.fields.text) b.text += redact(t) as string
    } else if (chunk.type === 'reasoning-delta') {
      const b = ensureBlock(rec, chunk.index, 'reasoning')
      const t = typeof chunk.text === 'string' ? chunk.text : ''
      b.chars += t.length
      if (policy.fields.reasoning) b.reasoning += redact(t) as string
    } else if (chunk.type === 'tool-call-delta') {
      const b = ensureBlock(rec, chunk.index, 'tool-call')
      if (typeof chunk.name === 'string') b.toolName = chunk.name
      if (chunk.id !== undefined) b.toolId = String(chunk.id)
      const t = typeof chunk.argumentsDelta === 'string' ? chunk.argumentsDelta : ''
      b.chars += t.length
      if (policy.fields.toolArgs) b.args += redact(t) as string
    } else if (chunk.type === 'block-end') {
      const b = rec.blocks.get(chunk.index)
      if (b) b.endedAt = now
    } else if (chunk.type === 'usage') {
      rec.usage = cloneJson(chunk.usage)
    } else if (chunk.type === 'finish') {
      rec.finishReason = cloneJson(chunk.reason)
      rec.status = 'finished'
      rec.endedAt = now
    }
  } catch {}
}

function push(rec: Record_): void {
  records.push(rec)
  byId.set(rec.id, rec)
  while (records.length > CAPACITY) {
    const old = records.shift()!
    byId.delete(old.id)
  }
}

function previewOf(rec: Record_): string {
  const msgs = rec.request.messages
  if (Array.isArray(msgs)) {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m && m.role === 'user') {
        const c = m.content
        if (typeof c === 'string' && c) return c.slice(0, 80)
        if (Array.isArray(c)) {
          for (const b of c) {
            if (b && typeof b.text === 'string' && b.text) return b.text.slice(0, 80)
          }
        }
      }
    }
  }
  return ''
}

function replyPreviewOf(rec: Record_): string {
  for (const b of rec.blocks.values()) {
    if (b.text) return b.text.slice(0, 80)
  }
  for (const b of rec.blocks.values()) {
    if (b.toolName) return '[tool] ' + b.toolName
  }
  return ''
}

function summary(rec: Record_): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: rec.id,
    startedAt: rec.startedAt,
    source: rec.source,
    provider: rec.request.provider,
    model: rec.request.model,
    status: rec.status,
    chunks: rec.chunkCount,
    messageCount: rec.request.messageCount,
    toolCount: rec.request.toolCount,
    preview: previewOf(rec),
    replyPreview: replyPreviewOf(rec),
  }
  if (rec.api !== undefined) {
    out.api = rec.api
    out.protocol = protocolLabel(rec.api)
    if (rec.apiGuessed) out.protocolGuessed = true
  }
  if (rec.baseURL !== undefined) out.baseURL = rec.baseURL
  if (rec.sessionId !== undefined) out.sessionId = rec.sessionId
  if (rec.turn !== undefined) out.turn = rec.turn
  if (rec.step !== undefined) out.step = rec.step
  if (rec.usage !== undefined) out.usage = rec.usage
  if (rec.finishReason !== undefined) out.finishReason = rec.finishReason
  if (rec.error !== undefined) out.error = rec.error
  if (rec.firstChunkAt) out.ttftMs = rec.firstChunkAt - rec.startedAt
  if (rec.endedAt) out.durationMs = rec.endedAt - rec.startedAt
  return out
}

function sharedPrefixCount(rec: Record_): number {
  if (!rec.sessionId || !Array.isArray(rec.request.messages)) return 0
  const idx = records.indexOf(rec)
  if (idx <= 0) return 0
  const b = rec.request.messages as unknown[]
  for (let i = idx - 1; i >= 0; i--) {
    const prev = records[i]
    if (prev.sessionId !== rec.sessionId || !Array.isArray(prev.request.messages)) continue
    const a = prev.request.messages as unknown[]
    let n = 0
    const max = Math.min(a.length, b.length)
    while (n < max) {
      let sa: string, sb: string
      try { sa = JSON.stringify(a[n]); sb = JSON.stringify(b[n]) } catch { break }
      if (sa !== sb) break
      n++
    }
    return n
  }
  return 0
}

function wireOf(req: any): Record<string, unknown> {
  const messages: unknown[] = []
  if (typeof req.system === 'string' && req.system) messages.push({ role: 'system', content: req.system })
  if (Array.isArray(req.messages)) for (const m of req.messages) messages.push(m)
  const out: Record<string, unknown> = { model: req.model, messages, stream: true, stream_options: { include_usage: true } }
  if (Array.isArray(req.tools) && req.tools.length > 0) {
    out.tools = req.tools.map((t: any) => ({ type: 'function', function: { name: t && t.name, description: t && t.description, parameters: t && t.parameters } }))
  }
  if (req.reasoningEffort !== undefined) out.reasoning_effort = req.reasoningEffort
  if (req.temperature !== undefined) out.temperature = req.temperature
  if (req.maxTokens !== undefined) out.max_tokens = req.maxTokens
  if (req.stop !== undefined) out.stop = req.stop
  return out
}

function detail(rec: Record_): Record<string, unknown> {
  const out = summary(rec)
  out.request = rec.request
  out.wire = wireOf(rec.request)
  out.blocks = Array.from(rec.blocks.values()).sort((a, b) => a.index - b.index)
  out.sharedPrefix = sharedPrefixCount(rec)
  out.policyEcho = cloneJson(policy)
  return out
}

/* ------------------------------------------------------------------ */
/* HTTP transport (Client half fetches these same-origin routes)       */
/* ------------------------------------------------------------------ */

function sendJson(res: ServerResponse, value: unknown, status = 200): void {
  try {
    const body = JSON.stringify(value === undefined ? null : value)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    try { res.end() } catch {}
  }
}

function readBody(req: IncomingMessage, limit = 1024 * 1024): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const parts: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      parts.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(parts).toString('utf8')))
    req.on('error', reject)
  })
}

function applyPolicyPatch(args: any): Policy {
  if (args && typeof args === 'object') {
    if (args.sources && typeof args.sources === 'object') {
      for (const k of Object.keys(policy.sources) as (keyof Policy['sources'])[]) {
        if (typeof args.sources[k] === 'boolean') policy.sources[k] = args.sources[k]
      }
    }
    if (args.fields && typeof args.fields === 'object') {
      for (const k of Object.keys(policy.fields) as (keyof Policy['fields'])[]) {
        if (typeof args.fields[k] === 'boolean') policy.fields[k] = args.fields[k]
      }
    }
    if (Array.isArray(args.redactions)) {
      policy.redactions = args.redactions.filter((s: unknown) => typeof s === 'string' && s.length > 0)
    }
  }
  return policy
}

async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const sub = url.pathname.slice(ROUTE_PREFIX.length) || '/'
    if (req.method === 'GET' && sub === '/list') {
      sendJson(res, records.slice().reverse().map(summary))
      return
    }
    if (req.method === 'GET' && sub === '/get') {
      const rec = byId.get(url.searchParams.get('id') || '')
      sendJson(res, rec ? detail(rec) : null)
      return
    }
    if (req.method === 'POST' && sub === '/clear') {
      records.length = 0
      byId.clear()
      sendJson(res, null)
      return
    }
    if (req.method === 'GET' && sub === '/policy') {
      sendJson(res, cloneJson(policy))
      return
    }
    if (req.method === 'POST' && sub === '/policy') {
      const text = await readBody(req)
      let patch: unknown = null
      try { patch = text ? JSON.parse(text) : null } catch {}
      sendJson(res, cloneJson(applyPolicyPatch(patch)))
      return
    }
    sendJson(res, { error: 'not found' }, 404)
  } catch (e) {
    sendJson(res, { error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

/* ------------------------------------------------------------------ */

export const name = 'sseye'

export function apply(ctx: Context): void {
  const svcs: Svcs = {
    llm: ctx.get('llm') as Svcs['llm'],
    settings: ctx.get('settings') as Svcs['settings'],
  }

  ctx.on('agent/request', (payload: any, next: () => unknown) => {
    try {
      if (payload && payload.signal) {
        if (coordBySignal.size > 200) coordBySignal.clear()
        coordBySignal.set(payload.signal, { turn: payload.turn, step: payload.step })
      }
    } catch {}
    return next()
  })

  ctx.on('llm/stream', (options: any, next: () => AsyncIterable<unknown>) => {
    let source = 'other'
    try { source = sourceOf(options) } catch {}
    if (!policy.sources[source as keyof Policy['sources']]) return next()

    const id = 'c' + (++seq)
    let coord: { turn?: number; step?: number } | undefined
    try {
      if (options.signal) {
        coord = coordBySignal.get(options.signal)
        coordBySignal.delete(options.signal)
      }
    } catch {}

    const rec: Record_ = {
      id,
      startedAt: Date.now(),
      firstChunkAt: 0,
      endedAt: 0,
      status: 'running',
      source,
      request: copyRequest(options),
      blocks: new Map(),
      chunkCount: 0,
    }
    if (options.sessionId !== undefined && options.sessionId !== null) rec.sessionId = String(options.sessionId)
    if (coord) { rec.turn = coord.turn; rec.step = coord.step }
    try {
      const route = resolveRoute(svcs, options.provider)
      if (route.api !== undefined) {
        rec.api = route.api
        if (route.guessed) rec.apiGuessed = true
      }
      if (route.baseURL !== undefined) rec.baseURL = route.baseURL
    } catch {}

    let inner: AsyncIterable<unknown>
    try {
      inner = next()
    } catch (e) {
      rec.status = 'error'
      rec.error = e instanceof Error ? e.message : String(e)
      rec.endedAt = Date.now()
      push(rec)
      throw e
    }
    push(rec)

    const tap = (async function* () {
      try {
        for await (const chunk of inner) {
          observeChunk(rec, chunk)
          yield chunk
        }
        if (rec.status === 'running') {
          rec.status = 'finished'
          rec.endedAt = Date.now()
        }
      } catch (e) {
        rec.status = 'error'
        rec.error = e instanceof Error ? e.message : String(e)
        rec.endedAt = Date.now()
        throw e
      } finally {
        if (!rec.endedAt) rec.endedAt = Date.now()
      }
    })()
    return tap
  })

  // The panel reaches the Host over same-origin routes, so registration must
  // wait for the `webServer` service. Reading it with a bare `ctx.get` here
  // races the composition: `webServer` mounts earlier in the tree but is not
  // guaranteed to be in the store when this body runs, so the plugin would keep
  // capturing while the panel silently had no route to fetch. `ctx.inject`
  // defers this branch until the service is live and re-runs it if it reloads.
  // Scoped to the routes only — capture itself stays active on profiles that
  // have no webServer at all (tui, headless).
  ctx.inject(['webServer'], (web: Context) => {
    const webServer = web.get('webServer') as { register(route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void }
    web.effect(() => webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: handleHttp }), 'sseye: http routes')
  })

  console.log('dsh-sseye: llm/stream capture active, capacity ' + CAPACITY)
}
