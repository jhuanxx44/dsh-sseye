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

## Platform facts (verified 2026-08-20 against installed DSH; re-verified 2026-10-12 against DSH 0.2.0-rc.2)

- Waterfall event: `'llm/stream'(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>)` — `options` is deep-frozen; listeners read, never rewrite; must yield chunks through.
- `GenerateOptions`: `provider, model, reasoningEffort?, messages, system?, tools?, temperature?, maxTokens?, stop?, signal?, sessionId?, purpose?('compaction'|'session-title')`.
- `StreamChunk`: `block-start | text-delta | reasoning-delta | tool-call-delta | block-end | usage | finish`.
- Correlation: `agent/request` carries `{ agent, turn, step, signal }`; correlate with `llm/stream` by shared `AbortSignal` + agent identity + sessionId. Replayed calls lack the agent-loop marker — tag them as manual replays in the capture list. (`agent` is fused in by `agentEvents`, not passed by the dispatch site — `dsh-agent-loop` dispatches `{turn, step, signal}` and `dsh-agent`'s `agentEvents` spreads `agent` on top; the scope invariant requires it.)
- **0.2.0-rc.2 re-verification** (desktop runtime: app 0.2.0-rc.2, bundled packages 0.2.0-rc.2 — a scratch profile booted with a local fake OpenAI-compatible provider): everything above holds. `webServer.register({ kind, path, handler })` is unchanged, and one real session produced two captured calls with correct turn/step, usage, TTFT and full message text. No break landed between 0.1.5-rc.1 and 0.2.0-rc.2.

### Client shell — right column tab contract (verified 2026-09-16 against DSH 0.1.5-rc.1; re-verified 2026-10-12 against DSH 0.2.0-rc.2)

**Breaking vs. earlier versions**: the shell's right column was rebuilt from a single `details` slot into a tabbed dock. `ctx.layout.openDetails()` / `closeDetails()` and the `details` slot **no longer exist**; a plugin still registering into `details` loads cleanly and then renders nothing — the silent-failure mode that broke v0.4.2 on upgrade.

- Owner: `@deepseek-ai/dsh-client-ui-sidebar-right`. It provides `sidebarRightTabs` (tab-type registry) and `sidebarRight` (navigation). `ctx.layout` retains `toggleSidebar`, `openRightbar(track, fullscreen)`, `closeRightbar()`, `selectPanel()`, `beginNavigation()`.
- A panel is three registrations, all keyed by one registration `id`:
  1. **type** — `ctx.get('sidebarRightTabs').register({ id, kind, priority: 'extension', title: (address) => string, patterns?, canOpen?, guide? })`, returning an idempotent disposer;
  2. **body** — slot `sidebar.right.pane.tab` with `{ name, key: id }`; its props carry `sessionId` and the framework hook `useTabInfo` (the flattened `hooks.tabInfo`);
  3. **optional live chip title** — `sidebar.right.pane.tab.title`, same `key`; without it the chip shows the registry's `title()` captured at open time.
- Opening: `ctx.get('sidebarRight').openTab(kind, { revealIfOpened: true })` — idempotent per kind. Closing goes through the record's own `useTabInfo().tab.actions.close()` (session-correct), not the controller. `toggleExpanded()` collapses to the rail without closing.
- A hidden column keeps the tab body **mounted** (the shell only sets `visibility: hidden` and moves it off-frame). Read `useTabInfo().tab.visible` for "am I showing" — `getBoundingClientRect().width` stays non-zero while collapsed, and an unmount means the tab itself is gone.
- Obtain both services via `ctx.inject(['sidebarRightTabs', 'sidebarRight'], …)` rather than the module-level `inject` list, so a shell without the dock still loads the capture list.
- Each `guide` entry needs an `id`: the registry indexes guide rows by it (`register` throws on a duplicate `id` **within** one definition) and the shell keys the rendered row by `JSON.stringify([providerId, id])`. One entry with `id: undefined` happens to pass the duplicate check and does render, but it is an accident, not a contract — shipped rows (`dsh-client-ui-sidebar-files`) carry one. `commandId` and `icon` are optional extras we do not use.
- No `keepMounted` means the dock unmounts the body of a *background* tab (a tab that is not its pane's active one); it has no effect on a collapsed column, which still keeps the active tab mounted. We do not ask for `keepMounted` — the capture list re-fetches on mount and the buffer lives in the Host.
- Geometry is viewport-relative upstream (`RIGHTBAR_DEFAULT_RATIO` 0.45 open, `RIGHTBAR_MAX_RATIO` 0.7 drag). There is **one** width for the whole column and no per-tab width in the API: `openTab` / `openRightbar` take none, and the public `ctx.layout` face exposes no width setter or reader, so a plugin cannot seed a narrower width without stomping the user's own drag. Narrowing the *default* is therefore a harness patch (`docs/harness-patches.md` §1, 0.45 → 0.28 on this machine), and `setRightbar` exists only as a private bound action.

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
