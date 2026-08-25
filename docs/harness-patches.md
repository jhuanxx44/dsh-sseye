# Harness local patches

Optional, out-of-tree tweaks to the installed DeepSeek Harness. **Nothing here is required** — SSEye is built to work on a stock install. Each patch is **overwritten by `dsh` upgrades**, so treat one as a standing cost: re-apply after every upgrade, or skip it.

## 1. Wider details column (dsh-client-ui-layout) — optional comfort

**Status**: not applied by default, and not needed. Since v0.4.1 the panel is laid out to hold up at the stock `360px`: the header splits into an identity row plus a wrapping action row (close is an icon, not a text button), help text wraps instead of being clipped, and the capture-policy groups stack with one capacity field per row. Take this patch only if you personally prefer a roomier column.

**Why it can't live in this repo**: SSEye only *occupies* the shell's right `details` column; it does not own the width. The `details` slot exposes no width prop and no width registration option, and the public `ctx.layout` face is just `openDetails()` / `closeDetails()` / `toggleSidebar()` — the width setter stays internal to the shell's layout store. So the shell hardcodes the open default at `360px` and clamps dragging to `300–520px`, and the only lever is editing the installed bundle below.

**File**: `<dsh-install>/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
(`<dsh-install>` = the global `@deepseek-ai/dsh` root, e.g. `~/.nvm/versions/node/v22.22.0/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`)

**Edits** (3 exact replacements):

| before | after |
|---|---|
| `clampWidth(details, 300, 520)` (in `computeColumns`) | `clampWidth(details, 300, 800)` |
| `d.details = clampWidth(px, 300, 520)` (in `setDetails`) | `d.details = clampWidth(px, 300, 800)` |
| `if (d.details === 0) d.details = 360` (in `openDetails`) | `if (d.details === 0) d.details = 520` |

**Apply**: edit + reload the browser page (the client bundle is served from this file at page load; no harness restart needed).

**Revert**: apply the table right-to-left — `800` back to `520` in both clamps, and the `openDetails` default back to `360`. Reinstalling the package works too; the file is a build artifact, so a fresh install is always pristine.

**Upstream candidate**: a width setter on `ctx.layout` (or a persisted layout store), plus a raised or viewport-relative drag clamp. That would retire this patch entirely.
