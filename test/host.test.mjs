/**
 * Smoke tests against the BUILT host artifact (lib/index.js): capture via the
 * llm/stream waterfall, chunk tee-through identity, and the HTTP routes
 * (/list, /export single + bundle + error branches).
 *
 * Run: pnpm build && pnpm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import * as sseye from '../lib/index.js'

/* ------------------------------------------------------------------ */
/* Minimal harness fakes                                               */
/* ------------------------------------------------------------------ */

function fakeCtx() {
  const listeners = {}
  const routes = []
  const ctx = {
    get(name) {
      if (name === 'webServer') return { register(r) { routes.push(r); return () => {} } }
      return undefined
    },
    on(event, fn) { listeners[event] = fn },
    inject(_names, fn) { fn(ctx) },
    effect(fn) { fn() },
  }
  return { ctx, listeners, routes }
}

function callRoute(handler, method, url, body) {
  return new Promise((resolve) => {
    const listeners = {}
    const req = {
      method,
      url,
      on(ev, fn) { listeners[ev] = fn },
      destroy() {},
    }
    const res = {
      status: 0,
      headers: {},
      body: '',
      writeHead(s, h) { this.status = s; this.headers = h || {} },
      end(b) { this.body = b || ''; resolve(this) },
    }
    Promise.resolve(handler(req, res)).then(
      () => resolve(res),
      () => resolve(res),
    )
    if (body !== undefined) {
      // The handler attaches its listeners synchronously before awaiting the
      // body, so firing data/end on the next microtask is safe.
      const buf = Buffer.from(JSON.stringify(body))
      queueMicrotask(() => {
        if (listeners.data) listeners.data(buf)
        if (listeners.end) listeners.end()
      })
    }
  })
}

/* ------------------------------------------------------------------ */

async function boot() {
  const { ctx, listeners, routes } = fakeCtx()
  sseye.apply(ctx)
  assert.equal(typeof listeners['llm/stream'], 'function', 'llm/stream listener registered')
  assert.equal(routes.length, 1, 'one prefix route registered')
  assert.equal(routes[0].path, '/__sseye')
  const handler = routes[0].handler
  // The buffer and the policy are module-level state shared across tests in
  // this process — reset both through the real routes.
  const cleared = await callRoute(handler, 'POST', '/__sseye/clear')
  assert.equal(cleared.status, 200)
  const reset = await callRoute(handler, 'POST', '/__sseye/policy', {
    sources: { agent: true, compaction: true, title: true, other: true },
    fields: { system: true, messages: true, tools: true, reasoning: true, text: true, toolArgs: true },
    redactions: [],
    limits: { capacity: 100, maxString: 200000, maxBlock: 1000000 },
  })
  assert.equal(reset.status, 200)
  return { stream: listeners['llm/stream'], handler }
}

function makeChunks() {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'Hello' },
    { type: 'text-delta', index: 0, text: ' world' },
    { type: 'usage', usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 7 } },
    { type: 'finish', reason: 'stop' },
  ]
}

async function captureOne(stream) {
  const src = makeChunks()
  const options = {
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    system: 'sys',
    messages: [{ role: 'user', content: 'hi' }],
    temperature: 0.7,
    sessionId: 'sess-test',
  }
  const tapped = stream(options, async function* () { for (const c of src) yield c })
  const got = []
  for await (const c of tapped) got.push(c)
  return { src, got }
}

test('capture tees every chunk through unchanged (identity + order)', async () => {
  const { stream } = await boot()
  const { src, got } = await captureOne(stream)
  assert.equal(got.length, src.length)
  for (let i = 0; i < src.length; i++) assert.equal(got[i], src[i], 'chunk ' + i + ' identity')
})

test('/list returns the capture; /export downloads it as an attachment', async () => {
  const { stream, handler } = await boot()
  await captureOne(stream)

  const list = await callRoute(handler, 'GET', '/__sseye/list')
  assert.equal(list.status, 200)
  const items = JSON.parse(list.body)
  assert.equal(items.length, 1)
  const it = items[0]
  assert.equal(it.model, 'deepseek-chat')
  assert.equal(it.status, 'finished')
  assert.equal(it.chunks, 5)
  assert.equal(it.usage.cacheReadTokens, 7)

  const exp = await callRoute(handler, 'GET', '/__sseye/export?ids=' + it.id + '&name=T1-S1-' + it.id)
  assert.equal(exp.status, 200)
  assert.equal(exp.headers['content-disposition'], 'attachment; filename="sseye-T1-S1-' + it.id + '.json"')
  assert.match(exp.headers['content-type'], /application\/json/)
  const payload = JSON.parse(exp.body)
  assert.equal(payload.tool, 'dsh-sseye')
  assert.equal(payload.kind, 'record')
  assert.equal(payload.record.id, it.id)
  assert.equal(payload.record.request.model, 'deepseek-chat')
  assert.equal(payload.record.request.system, 'sys')
  assert.equal(payload.record.blocks.length, 1)
  assert.equal(payload.record.blocks[0].text, 'Hello world')
})

test('/export bundles multiple ids and survives unknown ones', async () => {
  const { stream, handler } = await boot()
  await captureOne(stream)
  await captureOne(stream)
  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  assert.equal(items.length, 2)
  const ids = items.map((i) => i.id).join(',') + ',nope'

  const res = await callRoute(handler, 'GET', '/__sseye/export?ids=' + ids)
  assert.equal(res.status, 200)
  assert.match(res.headers['content-disposition'], /^attachment; filename="sseye-bundle-3\.json"$/)
  const payload = JSON.parse(res.body)
  assert.equal(payload.kind, 'bundle')
  assert.equal(payload.count, 2)
  assert.equal(payload.records.length, 2)
})

test('/export rejects missing ids and unsanitized names', async () => {
  const { stream, handler } = await boot()
  await captureOne(stream)
  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)

  const bad = await callRoute(handler, 'GET', '/__sseye/export')
  assert.equal(bad.status, 400)

  const nasty = await callRoute(handler, 'GET', '/__sseye/export?ids=' + items[0].id + '&name=' + encodeURIComponent('../../etc/passwd; rm -rf'))
  assert.equal(nasty.status, 200)
  assert.match(nasty.headers['content-disposition'], /^attachment; filename="sseye-[A-Za-z0-9_-]+\.json"$/)
})

test('limits are runtime-tunable via /policy and clamped to bounds', async () => {
  const { stream, handler } = await boot()

  // Defaults are visible in the policy echo.
  const p0 = JSON.parse((await callRoute(handler, 'GET', '/__sseye/policy')).body)
  assert.deepEqual(p0.limits, { capacity: 100, maxString: 200000, maxBlock: 1000000 })

  // Tighten both truncation limits to their lower bound (1000).
  const patched = JSON.parse((await callRoute(handler, 'POST', '/__sseye/policy', { limits: { maxString: 1000, maxBlock: 1000 } })).body)
  assert.equal(patched.limits.maxString, 1000)
  assert.equal(patched.limits.maxBlock, 1000)

  const long = 'x'.repeat(1500)
  const tapped = stream(
    { provider: 'p', model: 'm', system: long, messages: [{ role: 'user', content: 'hi' }] },
    async function* () {
      yield { type: 'text-delta', index: 0, text: long }
      yield { type: 'finish', reason: 'stop' }
    },
  )
  for await (const _ of tapped) {}

  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  const d = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
  assert.match(d.request.system, /truncated, total 1500/)
  assert.ok(d.request.system.length < 1100, 'request field capped at maxString + marker')
  assert.match(d.blocks[0].text, /truncated, stream continued past 1000/)
  assert.equal(d.blocks[0].chars, 1500, 'chars keeps the true stream total')

  // Shrinking capacity trims the ring immediately, not on the next push.
  await captureOne(stream)
  await captureOne(stream)
  assert.equal(JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body).length, 3)
  await callRoute(handler, 'POST', '/__sseye/policy', { limits: { capacity: 2 } })
  const after = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  assert.equal(after.length, 2)
  assert.ok(!after.some((i) => i.id === items[0].id), 'oldest record evicted immediately')

  // Out-of-bounds and non-numeric values are clamped / ignored.
  const clamped = JSON.parse((await callRoute(handler, 'POST', '/__sseye/policy', { limits: { capacity: 0, maxString: 999999999, maxBlock: 'x' } })).body)
  assert.equal(clamped.limits.capacity, 1)
  assert.equal(clamped.limits.maxString, 20000000)
  assert.equal(clamped.limits.maxBlock, 1000, 'non-numeric ignored, previous value kept')
})

test('live /get returns only the streaming fields, not the request-side heavy half', async () => {
  const { stream, handler } = await boot()
  const long = 'y'.repeat(30000)
  const tapped = stream(
    { provider: 'deepseek-official', model: 'deepseek-chat', system: 'sys', messages: [{ role: 'user', content: 'hi' }], sessionId: 'sess-live' },
    async function* () {
      yield { type: 'text-delta', index: 0, text: 'partial' }
      yield { type: 'text-delta', index: 0, text: long }
    },
  )
  // Consume part of the stream and leave the record running, like a live poll would see it.
  const it = tapped[Symbol.asyncIterator]()
  await it.next()
  await it.next()

  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  assert.equal(items[0].status, 'running')

  const live = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?live=1&id=' + items[0].id)).body)
  assert.equal(live.id, items[0].id)
  assert.equal(live.status, 'running')
  assert.equal(live.chunks, 2)
  assert.ok(Array.isArray(live.blocks) && live.blocks.length === 1, 'blocks ride the live payload')
  // Live block text is capped for the transfer; chars keeps the true total.
  assert.ok(live.blocks[0].text.length < 26000, 'live block text capped')
  assert.match(live.blocks[0].text, /^partial/)
  assert.match(live.blocks[0].text, /live truncated/)
  assert.equal(live.blocks[0].chars, 'partial'.length + long.length)
  // The multi-megabyte request-side half must not be in a live tick.
  assert.ok(!('request' in live), 'no request in live payload')
  assert.ok(!('wire' in live), 'no wire in live payload')
  assert.ok(!('sharedPrefix' in live), 'no sharedPrefix in live payload')

  // The full /get still carries everything, untruncated by the live cap.
  const full = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
  assert.equal(full.request.model, 'deepseek-chat')
  assert.ok(Array.isArray(full.wire.messages))
  assert.equal(full.blocks[0].text, 'partial' + long, 'full get restores the whole block text')

  // Unknown ids answer null in both modes.
  assert.equal(JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?live=1&id=nope')).body), null)
})

test('/config echoes the locale; a zh row config localizes truncation markers', async () => {
  // boot() applies with no config → default English.
  {
    const { stream, handler } = await boot()
    const cfg = JSON.parse((await callRoute(handler, 'GET', '/__sseye/config')).body)
    assert.equal(cfg.locale, 'en')

    await callRoute(handler, 'POST', '/__sseye/policy', { limits: { maxString: 1000 } })
    const long = 'x'.repeat(1500)
    const tapped = stream(
      { provider: 'p', model: 'm', system: long, messages: [] },
      async function* () { yield { type: 'finish', reason: 'stop' } },
    )
    for await (const _ of tapped) {}
    const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
    const d = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
    assert.match(d.request.system, /truncated, total 1500 chars/)
  }

  // Re-applying with a zh row config switches the markers and the echo.
  {
    const { ctx, listeners, routes } = fakeCtx()
    sseye.apply(ctx, { locale: 'zh-CN' })
    const handler = routes[0].handler
    const cfg = JSON.parse((await callRoute(handler, 'GET', '/__sseye/config')).body)
    assert.equal(cfg.locale, 'zh')

    await callRoute(handler, 'POST', '/__sseye/clear')
    await callRoute(handler, 'POST', '/__sseye/policy', { limits: { maxString: 1000, maxBlock: 1000 } })
    const long = 'x'.repeat(1500)
    const tapped = listeners['llm/stream'](
      { provider: 'p', model: 'm', system: long, messages: [] },
      async function* () {
        yield { type: 'text-delta', index: 0, text: long }
        yield { type: 'finish', reason: 'stop' }
      },
    )
    for await (const _ of tapped) {}
    const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
    const d = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
    assert.match(d.request.system, /截断，共 1500 字符/)
    assert.match(d.blocks[0].text, /截断，流内容超过 1000 字符上限/)
  }

  // Unrecognized values fall back to English (and leave it in effect).
  {
    const { ctx, routes } = fakeCtx()
    sseye.apply(ctx, { locale: 'fr' })
    const cfg = JSON.parse((await callRoute(routes[0].handler, 'GET', '/__sseye/config')).body)
    assert.equal(cfg.locale, 'en')
  }
})

test('redaction patterns are precompiled per policy change and apply at capture time', async () => {
  const { stream, handler } = await boot()
  const patched = JSON.parse((await callRoute(handler, 'POST', '/__sseye/policy', { redactions: ['sk-[a-z0-9]+'] })).body)
  assert.deepEqual(patched.redactions, ['sk-[a-z0-9]+'])

  const tapped = stream(
    { provider: 'p', model: 'm', messages: [{ role: 'user', content: 'key sk-abc123 here' }] },
    async function* () { yield { type: 'text-delta', index: 0, text: 'leak sk-xyz789 out' } },
  )
  for await (const _ of tapped) {}

  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  assert.match(items[0].preview, /key \*\*\* here/)
  assert.ok(!items[0].preview.includes('sk-abc123'))
  const d = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
  assert.match(d.blocks[0].text, /leak \*\*\* out/)

  // Clearing the patterns through the same route disables redaction again.
  await callRoute(handler, 'POST', '/__sseye/policy', { redactions: [] })
  const tapped2 = stream(
    { provider: 'p', model: 'm', messages: [{ role: 'user', content: 'again sk-keep123 now' }] },
    async function* () { yield { type: 'finish', reason: 'stop' } },
  )
  for await (const _ of tapped2) {}
  const items2 = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  assert.match(items2[0].preview, /again sk-keep123 now/, 'patterns cleared rebuild the compiled set')
})

test('wire reconstruction expands tool-result user messages into role:"tool"', async () => {
  const { stream, handler } = await boot()
  const tapped = stream(
    {
      provider: 'deepseek-official',
      model: 'deepseek-chat',
      system: 'sys',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'run it' }] },
        {
          role: 'assistant',
          content: [
            { type: 'reasoning', text: 'think ' },
            { type: 'reasoning', text: 'hard' },
            { type: 'text', text: 'calling' },
            { type: 'tool-call', id: 'call_1', name: 'todo_write', arguments: '{"todos":[]}' },
          ],
        },
        // Pure tool-result message: user-role in the normalized model.
        {
          role: 'user',
          content: [{ type: 'tool-result', toolCallId: 'call_1', content: [{ type: 'text', text: 'Updated todo list.' }] }],
        },
        // Mixed user message: text first, then the tool result as its own entry.
        {
          role: 'user',
          content: [
            { type: 'text', text: 'and ' },
            { type: 'text', text: 'again' },
            { type: 'tool-result', toolCallId: 'call_2', content: [] },
          ],
        },
      ],
    },
    async function* () { yield { type: 'finish', reason: 'stop' } },
  )
  for await (const _ of tapped) {}

  const items = JSON.parse((await callRoute(handler, 'GET', '/__sseye/list')).body)
  const d = JSON.parse((await callRoute(handler, 'GET', '/__sseye/get?id=' + items[0].id)).body)
  const w = d.wire
  assert.equal(w.stream, true)

  const msgs = w.messages
  assert.equal(msgs[0].role, 'system')
  assert.equal(msgs[0].content, 'sys')

  assert.equal(msgs[1].role, 'user')
  assert.equal(msgs[1].content, 'run it')

  const a = msgs[2]
  assert.equal(a.role, 'assistant')
  assert.equal(a.content, 'calling')
  assert.equal(a.reasoning_content, 'think hard', 'reasoning replayed on tool-call turns')
  assert.equal(a.tool_calls.length, 1)
  assert.equal(a.tool_calls[0].id, 'call_1')
  assert.equal(a.tool_calls[0].type, 'function')
  assert.equal(a.tool_calls[0].function.name, 'todo_write')
  assert.equal(a.tool_calls[0].function.arguments, '{"todos":[]}')

  const t1 = msgs[3]
  assert.equal(t1.role, 'tool', 'tool-result expands to a standalone tool message')
  assert.equal(t1.tool_call_id, 'call_1')
  assert.equal(t1.content, 'Updated todo list.')

  assert.equal(msgs[4].role, 'user')
  assert.equal(msgs[4].content, 'and again', 'mixed user text joins before its tool results')

  const t2 = msgs[5]
  assert.equal(t2.role, 'tool')
  assert.equal(t2.tool_call_id, 'call_2')
  assert.equal(t2.content, '(no output)', 'empty tool-result content falls back like the adapter')
})
