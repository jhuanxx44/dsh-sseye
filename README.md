# dsh-sseye

> The LLM debug console inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — capture every model call, see everything, replay anything.

`dsh-sseye` is a DSH plugin that taps the harness-native `llm/stream` waterfall to capture the **full content** of every LLM call — complete messages, system prompt, tool schemas, streaming chunks, usage, the real wire protocol (`openai-completions` / `openai-responses` / `anthropic-messages` / …) and endpoint — and presents it in a DevTools-style viewer. Then it goes further: semantic diffs between calls, per-message context cost anatomy, and **Replay & Mutate** (clone a captured request, tweak it, re-issue it through `ctx.llm`, compare side by side).

It is the harness-internal sibling of [SSEye](#relationship-to-sseye): SSEye watches LLM HTTP traffic from the network layer; dsh-sseye sees the same truth from inside the harness, with zero proxies, zero certificates, and full agent semantics (turn / step / subagent / compaction attribution).

## Installation

```bash
dsh plugin --profile web add github:jhuanxx44/dsh-sseye
```

(Git-hosted installs build via the package's `prepare` script; allow the build key pnpm prints if it blocks, then re-run. Pre-built `lib/` is also committed, so a blocked `prepare` is harmless.) Restart the harness afterwards; the SSEye button appears in the Session header.

Uninstall:

```bash
dsh plugin --profile web remove dsh-sseye
```

## Repository layout

Standard DSH plugin form (host + web client halves):

```
├── cordis.patch.yml      # bundle patch: inserts the `sseye` plugin row into the profile
├── src/
│   ├── index.ts          # Host half: llm/stream capture, ring buffer, /__sseye/* HTTP routes
│   └── client/           # Client half: header trigger + overlay panel (React, slots)
├── lib/                  # built artifacts (committed; rebuilt by `prepare` on git installs)
├── tsdown.config.ts      # self-contained port of the official client-bundle contract
└── prototype/            # the validated dynamic-plugin prototype (historical reference)
```

Host ↔ Client transport is same-origin HTTP on the `webServer` service (`/__sseye/list|get|clear|policy`) — composition plugins have no package-private RPC.

## Development

```bash
pnpm install
pnpm build        # tsdown → lib/
pnpm test         # node --test
```

Local install from the checkout: `dsh plugin --profile web add .` (links the directory).

## Status

Working capture + viewer (graduated from the validated `prototype/`, v1.6 parity). Diff / token anatomy / Replay & Mutate are not implemented yet. See [AGENTS.md](AGENTS.md) for the design contract.

## Relationship to SSEye

Same diagnostic philosophy, two observation layers:

| | SSEye | dsh-sseye |
|---|---|---|
| Observation point | Network (mitmproxy) | Inside the harness (`llm/stream` waterfall) |
| Sees | Any SDK / app on the machine | DSH process only, but with full agent semantics |
| Setup cost | Proxy + CA trust | One plugin install |

## License

MIT
