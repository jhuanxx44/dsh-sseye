# dsh-sseye

> The LLM debug console inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — capture every model call, see everything.

**English** | [简体中文](README.zh-CN.md)

`dsh-sseye` is a DSH plugin that taps the harness-native `llm/stream` waterfall to capture the **full content** of every LLM call — complete messages, system prompt, tool schemas, streaming response blocks, usage, the real wire protocol and endpoint — and presents it in a DevTools-style viewer docked inside the harness. No proxy, no certificates, no extra setup, and full agent semantics: every capture carries turn / step / session / compaction attribution.

It is the harness-internal sibling of [SSEye](#relationship-to-sseye) — same diagnostic philosophy, different observation layer.

<p>
  <img src="assets/panel-detail.png" width="560" alt="SSEye panel: turn-grouped call list with an expanded inline detail — provider/model hero, TTFT/duration/usage stats, cache-hit bar, prompt and message sections">
</p>

## Installation

From npm (prebuilt — no build-approval step):

```bash
dsh plugin --profile web add dsh-sseye
```

Or straight from the source repo:

```bash
dsh plugin --profile web add github:jhuanxx44/dsh-sseye
```

Restart the harness; the SSEye button appears in the session header. (Git-hosted installs build via the package's `prepare` script; allow the build key pnpm prints if it blocks, then re-run. Pre-built `lib/` is committed, so a blocked build is harmless.)

Uninstall:

```bash
dsh plugin --profile web remove dsh-sseye
```

## Configuration

The UI is **English by default**. To switch the panel (and the truncation
markers embedded in captured content) to Chinese, override the plugin row's
config in your profile's patch layer — `~/.dsh/profiles/<profile>/cordis.patch.yml`:

```yaml
- id: sseye
  config:
    locale: zh-CN
```

Restart the harness after editing. Any value starting with `zh` selects
Chinese; everything else (or no config) is English.

## What you get

### Capture — full content, zero intrusion

- Every call's complete `GenerateOptions` (system prompt, messages, tools, sampling params) plus every stream chunk of the response — captured at the `llm/stream` waterfall and **tapped through unchanged**: chunk identity, ordering, backpressure, cancellation and thrown errors are preserved.
- Agent semantics for free: calls correlate with `agent/request` turn/step coordinates (shared `AbortSignal` identity) and are classified by source — agent loop / compaction / session-title / other.
- The **real wire protocol and endpoint** (`openai-completions`, `anthropic-messages`, `google-generative-ai`, …) resolved from the provider's settings profile; routes without a declared protocol fall back to a guess table, clearly marked with `~`.
- Timing and cost signals: TTFT, total duration, chunk count, usage including cache-read tokens, finish reason, errors.
- Image content is dropped at capture (placeholder kept); everything else is captured whole.

### Viewer — DevTools-style, docked in the harness

- **Turn-grouped list**: the consecutive calls of one turn group under a header aggregating call count, in/out tokens and total duration; compaction / title / other sources group separately. Collapsible.
- **Step rows** with status dot, step number, content preview, TTFT / duration / usage — metrics progressively hide as the column narrows (container queries), so content always wins.
- **Inline accordion detail**: click a row and the full detail expands right below it — one scroll flow, no second pane.
- **Detail view**: hero with provider/model, protocol chip, endpoint, stats grid and a **cache-hit ratio bar**; system prompt; messages; tool names; response blocks (text / reasoning / tool-call args); finish reason.
- **Context diffing, first degree**: each call's messages are compared with the previous call of the same session — the shared prefix collapses behind one click, and only the newly-added messages render highlighted.
- **Wire JSON reconstruction** mirroring the DeepSeek adapter's serialization: tool results expand to standalone `role:"tool"` messages, reasoning replays as `reasoning_content` on tool-call turns, reasoning effort resolves to the `thinking` object.
- Copy buttons on every block; syntax-colored JSON trees with in-place expansion for large arrays/objects.
- **JSON export**: per call (row hover / hero button) or per turn group (bundle); versioned, self-describing payload.
- **Live streaming view**: while a call is running, only the settling fields are polled and merged into the open detail; the loop backs off when idle and pauses completely while the panel is closed or the tab is hidden.
- 本会话 / 全部 session filter; one-click clear.
- **i18n**: English UI by default; Chinese via `config.locale` (see above).

The panel docks into the shell's right details column, taking it over from the shipped tool-details panel (which returns if you uninstall). [docs/harness-patches.md](docs/harness-patches.md) has a local patch to widen that column.

### Capture policy — runtime-tunable

- **Source toggles** (agent / compaction / session-title / other) and **field toggles** (system / messages / tools / reasoning / answer text / tool args). Omissions are marked honestly in the record (`N messages, not captured`), never silently blank.
- **Redaction**: a regex list, precompiled per policy change, applied **before** anything enters the buffer (`sk-…` → `***`).
- **Capacity**: ring-buffer size (default 100, max 5000), request-field truncation, response-block truncation — clamped to sane bounds; shrinking the buffer trims the oldest records immediately.
- Defaults are full capture. The policy panel sits collapsed at the top of the viewer, never in the way.

### Privacy posture

Full visibility, **zero persistence by default**. Captures live in a bounded in-memory ring buffer; process exit burns them. Export happens only on explicit user action. The `llm/stream` layer never sees API keys — they live inside the adapters — and redaction applies before buffering.

## Roadmap

Observation is the base; the differentiators come next:

- [ ] **Replay & Mutate** — clone a captured request, edit it, re-issue it through `ctx.llm.stream()`, compare responses side by side.
- [ ] **Semantic diffs** between consecutive calls, beyond the shared prefix.
- [ ] **Token anatomy** — per-message context-cost breakdown.
- [ ] **Cross-subagent fan-out aggregation**; route (provider/model) filters.

## Relationship to SSEye

| | SSEye | dsh-sseye |
|---|---|---|
| Observation point | Network (mitmproxy) | Inside the harness (`llm/stream` waterfall) |
| Sees | Any SDK / app on the machine | The DSH process only, but with full agent semantics |
| Setup cost | Proxy + CA trust | One plugin install |

## Development

```bash
pnpm install
pnpm build        # tsdown → lib/
pnpm test         # node --test
```

```
├── src/
│   ├── index.ts          # Host half: llm/stream capture, ring buffer, /__sseye/* HTTP routes
│   └── client/           # Client half: session-header trigger + details-column panel (React)
├── lib/                  # committed build artifacts (rebuilt by `prepare` on git installs)
├── docs/                 # platform field notes + local harness patches
├── cordis.patch.yml      # bundle patch: inserts the `sseye` plugin row into the profile
└── tsdown.config.ts      # client bundle contract
```

Host ↔ Client transport is same-origin HTTP on the `webServer` service (`/__sseye/*`). See [AGENTS.md](AGENTS.md) for the behavior contract and architecture invariants, and [docs/prototype-field-notes.md](docs/prototype-field-notes.md) for DSH platform field notes.

Local install from a checkout: `dsh plugin --profile web add .`. Releases are tag-triggered: bump version → commit → tag `v*` → push the tag.

## License

MIT
