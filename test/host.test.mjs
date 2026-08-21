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

function callRoute(handler, method, url) {
  return new Promise((resolve) => {
    const req = { method, url, on() {}, destroy() {} }
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
  // The buffer is module-level state shared across tests in this process —
  // reset it through the real /clear route.
  const cleared = await callRoute(handler, 'POST', '/__sseye/clear')
  assert.equal(cleared.status, 200)
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
