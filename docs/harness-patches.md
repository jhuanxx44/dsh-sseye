# Harness local patches

Local, out-of-tree tweaks to the installed DeepSeek Harness that this project relies on or prefers. Each patch is **overwritten by `dsh` upgrades** — re-apply after upgrading, and consider upstreaming.

## 1. Wider details column (dsh-client-ui-layout)

**Why**: SSEye docks into the shell's right `details` column. The shell hardcodes the open default at `360px` and clamps dragging to `300–520px`; there is no public width API and no persistence. For a debug console, 360px is cramped.

**File**: `<dsh-install>/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
(`<dsh-install>` = the global `@deepseek-ai/dsh` root, e.g. `~/.nvm/versions/node/v22.22.0/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`)

**Edits** (3 exact replacements):

| before | after |
|---|---|
| `clampWidth(details, 300, 520)` (in `computeColumns`) | `clampWidth(details, 300, 800)` |
| `d.details = clampWidth(px, 300, 520)` (in `setDetails`) | `d.details = clampWidth(px, 300, 800)` |
| `if (d.details === 0) d.details = 360` (in `openDetails`) | `if (d.details === 0) d.details = 520` |

**Apply**: edit + reload the browser page (the client bundle is served from this file at page load; no harness restart needed).

**Revert**: `pnpm` reinstall of the package, or restore from VCS-clean copy; the file is a build artifact of the published package.

**Upstream candidate**: width setter on `ctx.layout` (or persist the layout store), plus a raised/relative drag clamp.
