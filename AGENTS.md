# AGENTS.md — dsh-sseye

> This file is the behavior contract for any agent (or human) working in this repo.
> When in doubt, this file wins.

## What this project is

`dsh-sseye` is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin: an **LLM debug console** that lives inside the harness.

- It captures the **full content** of every LLM call via the host-side `llm/stream` waterfall event: complete `GenerateOptions` (messages, system prompt, tool schemas, sampling params) and the full `StreamChunk` response stream.
- It presents captures in a **formatted, DevTools-style viewer** (Client half, registered in Slots).
- It differentiates on **understanding and action**, not just observation: semantic diffs between calls, per-message token anatomy, cross-subagent fan-out aggregation, and **Replay & Mutate** (clone a captured request, edit it, re-issue via `ctx.llm.stream()`, compare responses side by side).

Positioning statement: **看见每一次调用的全部内容，改得了参数当场重放，diff 得出上下文的每一次变化。**

## Architecture invariants (do not break)

1. **Capture point is `llm/stream`, never the wire.** The plugin observes the harness-normalized request/response. Do NOT attempt wire-level capture (no `globalThis`/`fetch` monkey-patching) — dynamic-plugin sandboxes don't expose those globals, and patching them globally would break the trust model. The DeepSeek adapter's request body is a deterministic transform of `GenerateOptions`; reconstruct the wire JSON for display instead.
2. **Never mutate the stream.** Captured options arrive deep-frozen. The waterfall listener must tee chunks through unchanged — preserve chunk identity, ordering, backpressure, cancellation, and thrown-error identity. Replay means *clone and re-issue*, never in-place rewrite. A sniffer that alters traffic destroys its own credibility.
3. **Capture policy ≠ display filter.** Capture policy is destructive (decided in the Host pipeline before data enters the buffer); display filters are non-destructive view state. Never implement "hide" by dropping data at capture time unless the user explicitly configured a capture rule.
4. **Privacy posture: full visibility, zero persistence by default.** Captures live in a bounded in-memory ring buffer; process exit burns them. Export/persist only on explicit user action. The `llm/stream` layer never sees API keys (they live inside adapters) — keep it that way; redaction rules apply to captured content before buffering.
5. **Lifecycle discipline.** Every listener, timer, Slot registration, style, and RPC handler is owned by the plugin fiber (`ctx.on` / `ctx.effect` / returned disposers) so stop/update removes everything.
6. **No global side effects at module scope.** All work happens inside `apply(ctx)`.

## Key platform facts (verified 2026-08-20 against installed DSH)

- Host waterfall event: `'llm/stream'(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>)` — `options` is deep-frozen; listeners read, never rewrite; must yield chunks through.
- `GenerateOptions`: `provider, model, reasoningEffort?, messages, system?, tools?, temperature?, maxTokens?, stop?, signal?, sessionId?, purpose?('compaction'|'session-title')`.
- `StreamChunk`: `block-start | text-delta | reasoning-delta | tool-call-delta | block-end | usage | finish`.
- Correlation: `agent/request` carries `{ agent, turn, step, signal }`; correlate with `llm/stream` by shared `AbortSignal` + agent identity + sessionId (pattern proven by `dsh-request-flight-recorder`).
- Replay path: call `ctx.llm.stream(clonedOptions)`; replayed calls lack the agent-loop marker, so tag them as manual replays in the capture list.
- Host→Client: `harness.handle(method, handler)`; Client→Host: `host.call(method, args)`; JSON-only payloads.
- Client UI: register into queried Slots (e.g. `shell.overlay`, `sidebar.footer.action`, `conversation.chat.turnTail`) with `React.createElement` — no JSX, no bundler, no imports in dynamic plugin code.
- Dynamic-plugin host Builtins are limited to `ctx / harness / console / btoa / atob / TextEncoder / TextDecoder`. Don't assume `process`, `Buffer`, `fetch`, or native timers; the `timer` service provides them with inject.

## Capture policy model (product contract)

Three presets — `full` (default) / `structure` (metadata + sizes, no text) / `minimal` (call facts only) — plus four override dimensions:

1. **Source filter**: main session / subagents / compaction / session-title / manual replays (from `sessionId` / `purpose`).
2. **Route filter**: provider/model allowlist patterns.
3. **Field-level policy**: system / messages / tools / reasoning / answer / tool-args, each `capture | truncate:N | drop`.
4. **Redaction**: user regex list, applied before buffering, replaced with `***`.

Plus capacity controls: ring-buffer size and per-request byte cap.

Defaults must be the answer for 99% of users: `full` + all sources + no redaction + 100-entry buffer. Configuration UI lives in a collapsed "capture policy" region, never blocking the main view.

## Explicit non-goals

- Token/cost dashboards (covered by `dsh-llm-cost`, `dsh-balance`, …)
- Telemetry export to OTel/Langfuse/Prometheus (covered; conflicts with privacy posture)
- Wire-level packet capture (unreachable from dynamic plugins, poor ROI)
- Request/response in-place rewriting (see invariant 2)

## Competitors (know them, don't clone them)

- `cdxiaodong/dsh-llm-inspector` — capture + stats + audit.jsonl, no UI.
- `abinzhao/dsh-request-flight-recorder` — deliberately content-free diagnostics, `/flight` command. Borrow its correlation pattern and stream-observation discipline.
- `izz-BLUE/dsh-devtools` — metadata-first profiler UI from persisted session events.

## Relationship to SSEye

Sibling project (`~/code/sseye`): network-layer (mitmproxy) LLM API debugger. dsh-sseye implements the same diagnostic philosophy inside the DSH harness with zero network machinery. Insights flow both ways; code does not (different runtimes).

## Development

- Language: TypeScript source, compiled `lib/` committed (DSH installs plugins from git; see `dsh-llm-inspector` precedent).
- Manifest: `dsh.bundle` (required for `dsh plugin add` distribution).
- Tests: `node --test`, zero-dependency where possible.
- License: MIT.
