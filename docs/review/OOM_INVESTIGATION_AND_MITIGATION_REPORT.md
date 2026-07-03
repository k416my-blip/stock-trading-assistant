# OOM Investigation and Mitigation Report

**Generated:** 2026-07-03 (UTC+8)
**Branch:** `cursor/top3-maxdd-capital-audit` @ `c92e1e5` (pre-commit baseline)
**Platform:** Windows 10, 32 GB RAM

## Executive summary

Cursor OOM (~7.3 GB across 15 processes) was traced primarily to a **single renderer process** (editor UI heap) plus a cluster of **Extension Host / NodeService utility processes**. New tooling records per-category memory every 5 minutes, flags sustained growth, and integrates with `npm run status` / `npm run oom:report`. Mitigations (`.cursorignore`, `.vscode/settings.json` watcher excludes) are already applied. A **4-hour background logger** is active to confirm memory stabilizes.

## Methodology

1. **Process enumeration** — PowerShell `Get-CimInstance Win32_Process` with WMIC fallback; captures PID, name, command line, working set.
2. **Classification** — Pure-function rules in `scripts/lib/cursorProcessMemory.mjs`:
   - **Cursor Indexing** — `indexing` / `fileIndexer` in command line
   - **TypeScript Server** — `tsserver` / `typescript-language-features`
   - **Extension Host** — `--type=extensionHost` OR `--type=utility` + `node.mojom.NodeService` + `inspect-port` (Cursor packs extension runtime this way on Windows)
   - **Code Helper** — other NodeService utilities
   - **Cursor Main** — top-level `Cursor.exe` without `--type=`
   - **Cursor Other** — renderers, GPU, zygote, misc.
3. **Logging** — `npm run memory:log` appends JSONL to `.dev/cursor-memory-log.jsonl`; daemon mode every 5 min.
4. **Leak detection** — `npm run memory:leak-report` compares first vs last samples, linear-regression slope, flags >20% growth over ≥4 samples or sustained upward trend.

## Current snapshot (2026-07-03T04:23 UTC)

| Category | Count | RAM (MB) |
|----------|-------|----------|
| **Extension Host** | 8 | **1979** |
| **Cursor Indexing** | 0 | **0** |
| **TypeScript Server** | 0 | **0** |
| Cursor Main | 3 | 647 |
| Cursor Other | 6 | 1995 |
| **Cursor aggregate** | **17** | **~4622** |

System memory: **66%** (21.6 / 32.7 GB)

### Top consumers (by PID)

| PID | MB | Category | Notes |
|-----|-----|----------|-------|
| 30040 | ~2582 (peak) / ~1900 (current) | Cursor Other (renderer) | `--type=renderer` — **largest single process** |
| 31960 | ~606 | Extension Host | NodeService + inspect-port |
| 3440 | ~416 | Extension Host | NodeService + inspect-port |
| 5360 | ~423 | Cursor Main | root Cursor.exe |

## 7 GB root-cause analysis (prior ~7297 MB peak)

At the prior OOM investigation (~7297 MB across 15 Cursor processes):

1. **Renderer (PID 30040)** — **~2.6 GB (36%)**. The active editor/chat renderer holds the largest heap. This is not Extension Host or TS Server; it is the Chromium renderer for the focused Cursor window.
2. **Extension Host cluster (8× NodeService)** — **~2.0 GB (27%)**. Eight `--type=utility --utility-sub-type=node.mojom.NodeService` processes with `inspect-port`; reclassified as Extension Host. PID 31960 alone was ~606 MB.
3. **Cursor Main + GPU + secondary renderers** — **~1.5 GB (21%)**. Main process, GPU process, smaller renderers.
4. **TypeScript Server** — **not a separate process at capture time** (0 MB). TS language service may start lazily or run inside extension host; monitor over 4 h for appearance.
5. **Cursor Indexing** — **0 MB at capture**. Indexing may be idle or embedded; prior OOM likely driven by watcher pressure on `docs/` before `.cursorignore` hardening.

**Conclusion:** The ~7 GB aggregate was **not** one mystery process — it was **renderer bloat (PID 30040)** plus **eight Extension Host/NodeService workers**. Indexing and TS Server were not dominant at the instant of capture but remain monitored categories.

## Leak detection rules

- Minimum **4 samples** (20 min at 5-min interval; 4 h recommended for long-term).
- Flag if: memory **>20% growth** over window, **slope ≥5 MB/h** with >5% growth, or **monotonic increase ≥10%** over ≥30 min.
- Output: console + `.dev/cursor-memory-leak-report.json`

## Monitoring setup

| Command | Purpose |
|---------|---------|
| `npm run memory:log` | Single snapshot → JSONL + `.dev/cursor-memory-latest.json` |
| `npm run memory:log:daemon` | Background 5-min loop |
| `npm run memory:leak-report` | Analyze JSONL for leak suspects |
| `npm run status` | Dev resume + per-category Cursor breakdown |
| `npm run oom:report` | Post-OOM markdown report |
| `npm run memory:watch` | 60 s lightweight watchdog |

### 4-hour monitoring status

- **Started:** 2026-07-03T04:22:33Z
- **Daemon PID:** 29876 (node `cursor-memory-logger.mjs --daemon`)
- **Log path:** `.dev/cursor-memory-log.jsonl`
- **PID file:** `.dev/cursor-memory-logger.pid`
- **Interval:** 300 s (5 min)
- **Expected completion:** ~2026-07-03T08:22 UTC (4 h)

**After 4 hours, run:**

```bash
npm run memory:leak-report
npm run status
```

If no suspects and aggregate stable (±10%), OOM mitigation is confirmed for this workspace configuration.

## Mitigations already applied

- `.cursorignore` — excludes `docs/`, `scripts/`, `android/`, `ios/`, `node_modules/`, `.dev/`, evidence trees
- `.vscode/settings.json` — `files.watcherExclude` / `search.exclude` for docs, scripts, binaries, jsonl, images
- `typescript.tsserver.maxTsServerMemory`: 4096 MB cap
- `files.watcherInclude` limited to `src/**`, `tests/unit/**`, key config files

## Recommendations

1. Keep **docs/review** and **scripts/** out of Cursor index (already done).
2. After long agent sessions, **reload window** if renderer (PID with `--type=renderer`) exceeds 2 GB.
3. Run `npm run memory:leak-report` after each 4+ h dev session.
4. Avoid full `npm run test:unit` during IDE work; use focused vitest paths.
5. Post-OOM: `npm run oom:report` then `npm run status`.

## Verification

- Unit tests: `tests/unit/devStatus.test.ts`, `tests/unit/cursorProcessMemory.test.ts` — **9 passed**
- `npm run status`, `npm run memory:log`, `npm run memory:leak-report` — OK
- Typecheck: pre-existing failures in unrelated files (`manualOrderFlow.ts`, `conciergeEvidenceBuilder.ts`, etc.) — not introduced by this work

## Files added/changed

- `scripts/lib/cursorProcessMemory.mjs` — enumeration + classification + leak math
- `scripts/cursor-memory-logger.mjs` — JSONL logger
- `scripts/cursor-memory-leak-report.mjs` — leak analysis
- `scripts/lib/devStatusCore.mjs` — integrated cursor categories
- `scripts/dev-status.mjs`, `scripts/oom-report.mjs`, `scripts/memory-watchdog.mjs` — display updates
- `package.json` — `memory:log`, `memory:log:daemon`, `memory:leak-report`
