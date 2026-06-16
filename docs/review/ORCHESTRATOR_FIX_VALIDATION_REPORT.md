# Orchestrator Fix Validation Report

## Verdict: **PARTIAL_PASS → FIX APPLIED (pending 30m logcat re-verify)**

**Purpose:** Validate orchestrator fixes for HyperOS 3h RERUN (`20260616-143009`), identify remaining failures, implement logcat capture fix, and gate 12h test start.  
**User judgment:** **APP_GO** / **ORCHESTRATOR_PARTIAL_PASS** — app survival criteria met; orchestrator logcat aggregation was the sole blocker.

---

## Executive summary

| Layer | Verdict | Notes |
|-------|---------|-------|
| App (PID / FGS / WakeLock / Crash / ANR) | **GO** | 12/12 polls, PID 2506 stable, FGS+WL all polls |
| Orchestrator (writeEvidence / finalize) | **PASS** | No errno -4094; `finalizeRan=true` |
| Orchestrator (run-scoped logcat) | **FAIL → FIX** | 0-byte file; root cause identified; Node pipe fix applied |
| Orchestrator (heartbeat / price final) | **FAIL → FIX** | Symptom of empty live log + ephemeral `adb -d`; poll path also fixed |

---

## 1. Root cause: run-scoped logcat 0 bytes

### Symptom

RERUN `logcat-live-20260616-143009.log` remained **0 bytes** for the entire 3h15m window despite file creation and PID file written.

### Mechanism

`scripts/verify-hyperos-v9-3h-screen-off.mjs` used:

```powershell
adb -s SERIAL logcat -v threadtime 2>&1 | ForEach-Object { $_ | Out-File -FilePath '...' -Append -Encoding utf8 }
```

spawned as **detached PowerShell** with `stdio: 'ignore'`.

### Why it fails on Windows

1. **Detached pipeline consumer:** When Node spawns PowerShell detached with ignored stdio, the `adb logcat` stdout pipe may not be consumed reliably; `ForEach-Object` blocks or never receives lines when the child process tree is orphaned from the parent console.
2. **Per-line `Out-File -Append`:** Extremely slow and known to stall on high-volume logcat streams; combined with detached spawn, the file is created (truncate at start) but never appended.
3. **Fresh empty file vs legacy global log:** The 1h GO run (`20260616-091138`) showed **67 heartbeats** because it appended to the legacy `docs/review/twelve-hour-test/adb-logcat-live.log` (512 MB accumulated from prior sessions). RERUN used a **new per-run empty file** — exposing the broken capture path.

### Fix (commit pending)

New module `scripts/lib/hyperos-logcat-capture.mjs`:

- `spawn('adb', ['-s', serial, 'logcat', '-v', 'threadtime'])`
- `child.stdout.pipe(fs.createWriteStream(destPath, { flags: 'a' }))`
- Same for stderr
- `verify-hyperos-v9-3h-screen-off.mjs` updated to use Node capture instead of PowerShell

---

## 2. Root cause: heartbeat / price_update under-counting

### Symptom

| Source | heartbeat | price_update |
|--------|-----------|--------------|
| RERUN final (live log) | **0** | **0** |
| RERUN finalize (`adb -d` fallback) | **2** | **1** |
| RERUN poll peak | **6** | **2** |
| 1h GO (working live log) | **67** | (higher) |

### Mechanism (two compounding factors)

**A. Finalize path**

`readRunLogcat(ev)` prefers run-scoped live file; when **0 bytes**, falls back to `adb logcat -d` (device ring buffer only). Ring buffer holds ~few minutes of logs and rotates — 3h of `12H-MONITOR` events are gone at finalize.

**B. Poll path (pre-fix)**

Each 15m poll called `logcatDump()` (`adb logcat -d`) and counted matches in the **current ring snapshot**, not cumulative history. Counts fluctuate (negative deltas in RERUN table) because older lines drop as new system logs arrive. `heartbeatTotal` was a **snapshot peak**, not run total.

**C. App cadence vs expectation**

App emits `12H-MONITOR` heartbeat on `TWELVE_HOUR_HEARTBEAT_MS` (~15 min). Over 3h screen-off, **~12** heartbeats is expected in a full capture. The RERUN **expected ~34** gate assumed UI-wake cadence from shorter interactive runs.

### Fix

1. **Logcat capture fix** — live file accumulates full run history.
2. **Poll metrics** — `readMetricsLogcat(ev)` reads run-scoped live file when `bytes > 0`, so `heartbeatTotal` / `priceTotal` are **cumulative** across the run.
3. **Finalize** — unchanged logic; now receives non-empty live log.

---

## 3. RERUN validation matrix (20260616-143009)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | writeEvidence errors | **PASS** | No UNKNOWN errno -4094 |
| 2 | auto-finalize executed | **PASS** | `finalizeRan=true`, ended 2026-06-16 19:20:04 MYT |
| 3 | run-scoped logcat generated | **FAIL** | `logcat-live-20260616-143009.log` · **0** bytes |
| 4 | heartbeat final aggregation | **FAIL** | 0 (live) / 2 (`adb -d`) |
| 5 | price_update final aggregation | **FAIL** | 0 (live) / 1 (`adb -d`) |
| 6 | evidence.json saved | **PASS** | `hyperos-v15-3h-rerun-evidence.json` |
| 7 | full poll schedule (12) | **PASS** | 12/12 polls |

### App reference (informational — **APP_GO**)

| Item | Value |
|------|-------|
| PID | 2506 (baseline → final, **0 lost**) |
| FGS | Y on all 12 polls |
| WakeLock | Y on all 12 polls |
| Screen-off enforce | 8× |
| priceRefreshRuns (checkpoint) | 10 |

---

## 4. Fix implementation summary

| File | Change |
|------|--------|
| `scripts/lib/hyperos-logcat-capture.mjs` | **NEW** — Node adb → WriteStream capture |
| `scripts/verify-hyperos-v9-3h-screen-off.mjs` | Replace PowerShell capture; `readMetricsLogcat()` for polls |
| `scripts/verify-hyperos-logcat-capture-30m.mjs` | **NEW** — 30m logcat-only validation harness |

---

## 5. 30-minute logcat re-verification

See **`docs/review/LOGCAT_CAPTURE_30M_VALIDATION_REPORT.md`** (generated by `node scripts/verify-hyperos-logcat-capture-30m.mjs`).

**Gate:** `finalBytes > 0` and monotonic growth across samples.

---

## 6. GitHub sync

_(filled after commit/push)_
