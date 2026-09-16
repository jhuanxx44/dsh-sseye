# Harness local patches

Optional, out-of-tree tweaks to the installed DeepSeek Harness. **Nothing here is required to run SSEye** — it works on a stock install. Each patch is **overwritten by `dsh` upgrades**, so treat one as a standing cost: re-apply after every upgrade, or skip it.

## 1. Narrower right column (dsh-client-ui-layout) — ACTIVE on this machine

**Status**: applied. Stock DSH opens the right column at **45% of the frame**, which is 864px on a 1920-wide display — the panel is designed to hold up around 360px, so this is a taste patch, not a correctness one.

**What the column is**: one geometry, shared by every occupant. `ctx.sidebarRight` has no per-tab width and `openTab` / `openRightbar` take no width parameter, so the only lever on the *default* is the shell's own constant. The user's own drag writes a px preference that survives resize and close (in-memory; a page reload forgets it) — `rightbar ??=` only consults the ratio while that preference is still null.

**File**: `<dsh-install>/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
(`<dsh-install>` = the global `@deepseek-ai/dsh` root, e.g. `~/.nvm/versions/node/v22.22.0/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`)

**Edit** (1 exact replacement, line 17 — the constant is declared once and read once, at the `rightbar ??=` seed):

| before | after |
|---|---|
| `const RIGHTBAR_DEFAULT_RATIO = .45;` | `const RIGHTBAR_DEFAULT_RATIO = .28;` |

```bash
F=<dsh-install>/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js
perl -pi -e 's/const RIGHTBAR_DEFAULT_RATIO = \.45;/const RIGHTBAR_DEFAULT_RATIO = .28;/' "$F"
```

**Effect**: open width = `max(300, round(viewport × 0.28))` — 358px at 1280, 423px at 1512, 538px at 1920. `RIGHTBAR_MAX_RATIO = .7` (drag ceiling) is left alone, and the 300px floor plus the "center keeps ≥400px" rule are untouched, so a small window degrades exactly as before.

**Apply**: edit + reload the browser page. The host re-hashes the affected client batch at boot or on watch, so no harness restart is needed (verified: batch rev `4d5af5232242` → `e612be5b6da5` after the edit, page reload only).

**Revert**: change `.28` back to `.45`, or restore the pristine artifact:

```bash
cp local/harness-patches/dsh-client-ui-layout.client.js.orig \
   <dsh-install>/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js
```

`local/` is gitignored, so that backup is a machine-local convenience, not part of the repo. Reinstalling the package also restores it — the file is a build artifact.

**Blast radius**: every rightbar occupant, not just SSEye — the guide tab, file previews, and other plugins' tabs all open at the new ratio.

**Upstream candidate**: a width parameter on `ctx.sidebarRight.openTab(kind, { width })` or `ctx.layout.openRightbar(track, fullscreen, width)` — with a width *read* on the public face so a plugin can respect a user's existing preference instead of stomping it. Failing that, a layout setting persisted in `settings.yaml` would retire this patch for good.

## Retired — wider right column (`clampWidth(details, …)`, pre-0.1.5)

Kept so nobody re-applies it blindly. The old patch rewrote three clamps in the same bundle to widen a hardcoded `360px` column (`300–520` → `300–800`).

DSH 0.1.5-rc.1 made the geometry viewport-relative, so the widening side is no longer needed — and **the old three replacements no longer exist**: `details`, `setDetails`, and `openDetails` are gone from the bundle, and there is no `clampWidth(details, …)` call left to edit. Patch 1 above edits a different, still-present constant.
