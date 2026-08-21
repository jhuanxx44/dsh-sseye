# AGENTS.md — dsh-sseye

> Behavior contract for any agent (or human) working in this repo. When in doubt, this file wins.

## What this is

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin: an **LLM debug console**. It captures the **full content** of every LLM call via the host-side `llm/stream` waterfall (complete `GenerateOptions` + the full `StreamChunk` stream) and presents it in a DevTools-style viewer (Client half, registered in Slots). Differentiates on understanding and action — semantic diffs between calls, per-message token anatomy, cross-subagent fan-out aggregation, and **Replay & Mutate** (clone a captured request, edit, re-issue via `ctx.llm.stream()`, compare side by side).

Positioning: **看见每一次调用的全部内容，改得了参数当场重放，diff 得出上下文的每一次变化。**

## Architecture invariants (do not break)

1. **Capture point is `llm/stream`, never the wire.** No wire-level capture, no `globalThis`/`fetch` monkey-patching. The DeepSeek adapter's request body is a deterministic transform of `GenerateOptions`; reconstruct the wire JSON for display instead.
2. **Never mutate the stream.** Captured options arrive deep-frozen; the waterfall listener must tee chunks through unchanged — preserve chunk identity, ordering, backpressure, cancellation, and thrown-error identity. Replay means *clone and re-issue*, never in-place rewrite.
3. **Capture policy ≠ display filter.** Capture policy is destructive (decided in the Host pipeline before data enters the buffer); display filters are non-destructive view state. Never implement "hide" by dropping data at capture time unless the user explicitly configured a capture rule.
4. **Privacy: full visibility, zero persistence by default.** Captures live in a bounded in-memory ring buffer; process exit burns them. Export/persist only on explicit user action. The `llm/stream` layer never sees API keys (they live inside adapters) — keep it that way; redaction rules apply before buffering.
5. **Lifecycle discipline.** Every listener, timer, Slot registration, style, and HTTP route is owned by the plugin fiber (`ctx.on` / `ctx.effect` / returned disposers) so stop/update removes everything.
6. **No global side effects at module scope.** All work happens inside `apply(ctx)`.

## Platform facts (verified 2026-08-20 against installed DSH)

- Waterfall event: `'llm/stream'(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>)` — `options` is deep-frozen; listeners read, never rewrite; must yield chunks through.
- `GenerateOptions`: `provider, model, reasoningEffort?, messages, system?, tools?, temperature?, maxTokens?, stop?, signal?, sessionId?, purpose?('compaction'|'session-title')`.
- `StreamChunk`: `block-start | text-delta | reasoning-delta | tool-call-delta | block-end | usage | finish`.
- Correlation: `agent/request` carries `{ agent, turn, step, signal }`; correlate with `llm/stream` by shared `AbortSignal` + agent identity + sessionId. Replayed calls lack the agent-loop marker — tag them as manual replays in the capture list.

## Non-goals

Token/cost dashboards and telemetry export (OTel/Langfuse/Prometheus — covered by other plugins, and conflict with the privacy posture); wire-level packet capture; request/response in-place rewriting (invariant 2).

## Capture policy model (product contract)

Three presets — `full` (default) / `structure` (metadata + sizes, no text) / `minimal` (call facts only) — plus four override dimensions: **source filter** (main session / subagents / compaction / session-title / manual replays, from `sessionId`/`purpose`), **route filter** (provider/model allowlist patterns), **field-level policy** (system / messages / tools / reasoning / answer / tool-args, each `capture | truncate:N | drop`), **redaction** (user regex list, applied before buffering, replaced with `***`). Capacity controls: ring-buffer size and per-request byte cap.

Defaults must be the answer for 99% of users: `full` + all sources + no redaction + 100-entry buffer. Configuration UI lives in a collapsed "capture policy" region, never blocking the main view.

## Development

- Layout: `src/index.ts` (Host), `src/client/` (Web client), `cordis.patch.yml` (bundle layer), `lib/` built by tsdown and committed (DSH installs plugins from git; `prepare` rebuilds on install).
- Host↔Client: composition plugins have no package-private RPC — the Host registers same-origin HTTP routes on the `webServer` service (`/__sseye/*`), the Client fetches them. The `webServer` service is awaited via `ctx.inject`, not `ctx.get` (TUI/headless profiles have no webServer at all).
- Client bundle contract (single CJS file, `window.__ModuleLoader__.load` wrapper, platform externals via injected `require`) lives in `tsdown.config.ts`; tsdown ≥0.22 required.
- Manifest: `package.json` declares both `dsh.bundle.patch` (profile layer) and `dsh.client` (web module scan); `dsh plugin add` reconciles the layer list from installed state.
- Tests: `node --test`, zero-dependency where possible.
- Release: pushing a `v*` tag triggers `.github/workflows/publish.yml` — it builds, checks committed `lib/` is fresh, tests, verifies tag ↔ `package.json` version, then publishes to npm. Bump version → commit → tag → push tag.
- `docs/prototype-field-notes.md` — platform field notes from the dynamic-plugin prototype era (stale-run, theme tokens, slot contracts). `docs/harness-patches.md` — local harness patches to re-apply after upgrades.
- License: MIT.
