# dsh-sseye

> The LLM debug console inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — capture every model call, see everything, replay anything.

`dsh-sseye` is a DSH plugin that taps the harness-native `llm/stream` waterfall to capture the **full content** of every LLM call — complete messages, system prompt, tool schemas, streaming chunks, usage — and presents it in a DevTools-style viewer. Then it goes further: semantic diffs between calls, per-message context cost anatomy, and **Replay & Mutate** (clone a captured request, tweak it, re-issue it through `ctx.llm`, compare side by side).

It is the harness-internal sibling of [SSEye](#relationship-to-sseye): SSEye watches LLM HTTP traffic from the network layer; dsh-sseye sees the same truth from inside the harness, with zero proxies, zero certificates, and full agent semantics (turn / step / subagent / compaction attribution).

## Status

Early development. See [AGENTS.md](AGENTS.md) for the design contract.

## Relationship to SSEye

Same diagnostic philosophy, two observation layers:

| | SSEye | dsh-sseye |
|---|---|---|
| Observation point | Network (mitmproxy) | Inside the harness (`llm/stream` waterfall) |
| Sees | Any SDK / app on the machine | DSH process only, but with full agent semantics |
| Setup cost | Proxy + CA trust | One plugin install |

## License

MIT
