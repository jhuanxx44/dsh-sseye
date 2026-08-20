const CAPACITY = 100
const MAX_STRING = 200000

const records = []
const byId = new Map()
const coordBySignal = new Map()
let seq = 0

const policy = {
  sources: { agent: true, compaction: true, title: true, other: true },
  fields: { system: true, messages: true, tools: true, reasoning: true, text: true, toolArgs: true },
  redactions: [],
}

const PROTOCOLS = {
  'deepseek-official': 'OpenAI Chat Completions',
  'ollama-cloud': 'Ollama /api/chat (NDJSON)',
  'newapi': 'OpenAI-compatible (NewAPI)',
}

function sourceOf(options) {
  if (options.purpose === 'compaction') return 'compaction'
  if (options.purpose === 'session-title') return 'title'
  if (options.sessionId !== undefined && options.sessionId !== null) return 'agent'
  return 'other'
}

function capString(s) {
  if (typeof s !== 'string') return s
  if (s.length <= MAX_STRING) return s
  return s.slice(0, MAX_STRING) + '\n…[truncated, total ' + s.length + ' chars]'
}

function redact(s) {
  if (typeof s !== 'string' || policy.redactions.length === 0) return s
  let out = s
  for (const src of policy.redactions) {
    try { out = out.replace(new RegExp(src, 'g'), '***') } catch (e) {}
  }
  return out
}

function cloneJson(v) {
  if (v === null || v === undefined) return v === undefined ? null : v
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'string') return capString(redact(v))
  if (Array.isArray(v)) return v.map((x) => x === undefined ? null : cloneJson(x))
  if (typeof v === 'object') {
    if (v.type === 'image') return { type: 'image', omitted: true }
    const out = {}
    for (const k of Object.keys(v)) {
      const val = v[k]
      if (val === undefined || typeof val === 'function') continue
      out[k] = cloneJson(val)
    }
    return out
  }
  return String(v)
}

function copyRequest(options) {
  const req = { provider: options.provider, model: options.model }
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

function ensureBlock(rec, index, kind) {
  let b = rec.blocks.get(index)
  if (!b) {
    b = { index: index, kind: kind, text: '', reasoning: '', toolName: '', toolId: '', args: '', chars: 0, startedAt: Date.now() }
    rec.blocks.set(index, b)
  }
  return b
}

function observeChunk(rec, chunk) {
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
      if (policy.fields.text) b.text += redact(t)
    } else if (chunk.type === 'reasoning-delta') {
      const b = ensureBlock(rec, chunk.index, 'reasoning')
      const t = typeof chunk.text === 'string' ? chunk.text : ''
      b.chars += t.length
      if (policy.fields.reasoning) b.reasoning += redact(t)
    } else if (chunk.type === 'tool-call-delta') {
      const b = ensureBlock(rec, chunk.index, 'tool-call')
      if (typeof chunk.name === 'string') b.toolName = chunk.name
      if (chunk.id !== undefined) b.toolId = String(chunk.id)
      const t = typeof chunk.argumentsDelta === 'string' ? chunk.argumentsDelta : ''
      b.chars += t.length
      if (policy.fields.toolArgs) b.args += redact(t)
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
  } catch (e) {}
}

function push(rec) {
  records.push(rec)
  byId.set(rec.id, rec)
  while (records.length > CAPACITY) {
    const old = records.shift()
    byId.delete(old.id)
  }
}

function previewOf(rec) {
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

function replyPreviewOf(rec) {
  for (const b of rec.blocks.values()) {
    if (b.text) return b.text.slice(0, 80)
  }
  for (const b of rec.blocks.values()) {
    if (b.toolName) return '[tool] ' + b.toolName
  }
  return ''
}

function summary(rec) {
  const out = {
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
  const proto = PROTOCOLS[rec.request.provider]
  if (proto) out.protocol = proto
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

function sharedPrefixCount(rec) {
  if (!rec.sessionId || !Array.isArray(rec.request.messages)) return 0
  const idx = records.indexOf(rec)
  if (idx <= 0) return 0
  const b = rec.request.messages
  for (let i = idx - 1; i >= 0; i--) {
    const prev = records[i]
    if (prev.sessionId !== rec.sessionId || !Array.isArray(prev.request.messages)) continue
    const a = prev.request.messages
    let n = 0
    const max = Math.min(a.length, b.length)
    while (n < max) {
      let sa, sb
      try { sa = JSON.stringify(a[n]); sb = JSON.stringify(b[n]) } catch (e) { break }
      if (sa !== sb) break
      n++
    }
    return n
  }
  return 0
}

function wireOf(req) {
  const messages = []
  if (typeof req.system === 'string' && req.system) messages.push({ role: 'system', content: req.system })
  if (Array.isArray(req.messages)) for (const m of req.messages) messages.push(m)
  const out = { model: req.model, messages: messages, stream: true, stream_options: { include_usage: true } }
  if (Array.isArray(req.tools) && req.tools.length > 0) {
    out.tools = req.tools.map((t) => ({ type: 'function', function: { name: t && t.name, description: t && t.description, parameters: t && t.parameters } }))
  }
  if (req.reasoningEffort !== undefined) out.reasoning_effort = req.reasoningEffort
  if (req.temperature !== undefined) out.temperature = req.temperature
  if (req.maxTokens !== undefined) out.max_tokens = req.maxTokens
  if (req.stop !== undefined) out.stop = req.stop
  return out
}

function detail(rec) {
  const out = summary(rec)
  out.request = rec.request
  out.wire = wireOf(rec.request)
  out.blocks = Array.from(rec.blocks.values()).sort((a, b) => a.index - b.index)
  out.sharedPrefix = sharedPrefixCount(rec)
  out.policyEcho = cloneJson(policy)
  return out
}

return {
  apply(ctx) {
    ctx.on('agent/request', (payload, next) => {
      try {
        if (payload && payload.signal) {
          if (coordBySignal.size > 200) coordBySignal.clear()
          coordBySignal.set(payload.signal, { turn: payload.turn, step: payload.step })
        }
      } catch (e) {}
      return next()
    })

    ctx.on('llm/stream', (options, next) => {
      let source = 'other'
      try { source = sourceOf(options) } catch (e) {}
      if (!policy.sources[source]) return next()

      const id = 'c' + (++seq)
      let coord
      try {
        if (options.signal) {
          coord = coordBySignal.get(options.signal)
          coordBySignal.delete(options.signal)
        }
      } catch (e) {}

      const rec = {
        id: id,
        startedAt: Date.now(),
        firstChunkAt: 0,
        endedAt: 0,
        status: 'running',
        source: source,
        request: copyRequest(options),
        blocks: new Map(),
        chunkCount: 0,
      }
      if (options.sessionId !== undefined && options.sessionId !== null) rec.sessionId = String(options.sessionId)
      if (coord) { rec.turn = coord.turn; rec.step = coord.step }

      let inner
      try {
        inner = next()
      } catch (e) {
        rec.status = 'error'
        rec.error = e && e.message ? String(e.message) : String(e)
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
          rec.error = e && e.message ? String(e.message) : String(e)
          rec.endedAt = Date.now()
          throw e
        } finally {
          if (!rec.endedAt) rec.endedAt = Date.now()
        }
      })()
      return tap
    })

    harness.handle('list', () => records.slice().reverse().map(summary))

    harness.handle('get', (args) => {
      const rec = args && typeof args.id === 'string' ? byId.get(args.id) : undefined
      return rec ? detail(rec) : null
    })

    harness.handle('clear', () => {
      records.length = 0
      byId.clear()
      return null
    })

    harness.handle('get-policy', () => cloneJson(policy))

    harness.handle('set-policy', (args) => {
      if (args && typeof args === 'object') {
        if (args.sources && typeof args.sources === 'object') {
          for (const k of Object.keys(policy.sources)) {
            if (typeof args.sources[k] === 'boolean') policy.sources[k] = args.sources[k]
          }
        }
        if (args.fields && typeof args.fields === 'object') {
          for (const k of Object.keys(policy.fields)) {
            if (typeof args.fields[k] === 'boolean') policy.fields[k] = args.fields[k]
          }
        }
        if (Array.isArray(args.redactions)) {
          policy.redactions = args.redactions.filter((s) => typeof s === 'string' && s.length > 0)
        }
      }
      return cloneJson(policy)
    })

    console.log('dsh-sseye host: llm/stream capture active, capacity ' + CAPACITY)
  },
}
