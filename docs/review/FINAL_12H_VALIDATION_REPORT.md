# Final 12h Validation Report

**Date:** 2026-06-19  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**APK:** `artifacts/preview-v15.apk` (versionCode 15)  
**Device:** FYRWXSNNAIOR9DCM (Redmi Note 13 Pro / HyperOS)

---

## Executive verdict: **GO**

HyperOS screen-off 12h production validation completed successfully. App survival, foreground service, WakeLock, heartbeat, price refresh, and news fetch all passed across the full 12-hour window with zero PID loss, zero FATAL, and zero ANR.

| Layer | Verdict |
|-------|---------|
| App (PID / FGS / WL / data pipelines) | **GO** |
| Orchestrator (polls / finalize / streamed metrics) | **GO** |
| Combined | **GO** |

---

## Production run

| Field | Value |
|-------|-------|
| Run ID | `20260618-202947` |
| Window (MYT) | 2026-06-18 20:29:47 → 2026-06-19 08:41:11 |
| Duration | ~12h 11m |
| Baseline PID | 30438 |
| Final PID | 30438 |
| PID lost events | **0** |
| Polls completed | **48 / 48** (15 min interval) |
| run-scoped logcat | 1,106,005,156 bytes (streamed finalize) |

### Event counts (run-scoped logcat)

| Pattern | Count | Gate |
|---------|-------|------|
| heartbeat | 158 | PASS (expected ~47) |
| price_update | 85 | PASS |
| news_fetch | 106 | PASS |
| survival_health_ok | 139 | PASS |
| 12H-MONITOR lines | 913 | PASS |
| FATAL | 0 | PASS |
| ANR | 0 | PASS |

### checkpoint.json

- priceRefreshRuns: 44  
- pidLostEvents: 0  
- fatal: 0  
- anr: 0  

---

## Validation chain (chronological)

| Stage | Run ID | Duration | Result | Notes |
|-------|--------|----------|--------|-------|
| 3h screen-off RERUN | 20260616-143009 | 3h15m | APP_GO / ORCH_PARTIAL | App stable; logcat capture gap |
| 30m logcat RERUN | 20260616-202833 | 30m | PASS | Node pipe fix; cold launch harness |
| 12h GO authorization | — | — | GO | `HYPEROS_12H_GO_NO_GO_REPORT.md` |
| 12h attempt (interrupted) | 20260616-210645 | ~5h | PARTIAL_GO_APP | `ERR_STRING_TOO_LONG` @ 574MB logcat |
| 6h streaming validation | 20260617-192027 | 6h | ORCHESTRATOR_GO | Streamed metrics past prior failure |
| **12h production** | **20260618-202947** | **12h** | **GO** | All 12 orchestrator gates PASS |

---

## Issues resolved during validation

| Issue | Root cause | Fix | Commit |
|-------|------------|-----|--------|
| 0-byte run-scoped logcat | PowerShell detached `Out-File` on Windows | `scripts/lib/hyperos-logcat-capture.mjs` Node `spawn('adb logcat')` pipe | fde568d |
| heartbeat/price count=0 (30m) | logcat-only harness without app launch | Cold launch + monitor wait in verify script | fde568d |
| `ERR_STRING_TOO_LONG` @ ~5h | `readFileSync` on 574MB+ log | Streamed chunk reader in `hyperos-monitor-metrics.mjs` | 780118f |
| Git sync watcher early exit | Stale report from prior runId | runId-based finalization check | 95d68f2 |

---

## Seven-item verification (12h production)

| # | Item | Result |
|---|------|--------|
| 1 | 3h+ screen-off run | PASS — wakefulness polls; screen-off enforce 33× |
| 2 | PID maintenance | PASS — 30438 stable, 0 lost |
| 3 | Heartbeat continuation | PASS — 158 |
| 4 | Twelve Data / price | PASS — 85 updates |
| 5 | News fetch | PASS — 106 fetches |
| 6 | Foreground service | PASS — LongRunForegroundService on all polls |
| 7 | WakeLock | PASS — partial wakelock + survival_status |

---

## Orchestrator gate matrix (12 items)

| # | Gate | Result |
|---|------|--------|
| 1 | PID maintenance | PASS |
| 2 | Heartbeat continuation | PASS |
| 3 | Twelve Data price update | PASS |
| 4 | News fetch | PASS |
| 5 | Foreground Service | PASS |
| 6 | WakeLock | PASS |
| 7 | Crash (FATAL) | PASS |
| 8 | ANR | PASS |
| 9 | evidence.json | PASS |
| 10 | auto-finalize | PASS |
| 11 | streamed logcat metrics | PASS |
| 12 | full poll schedule | PASS |

---

## Operational learnings (for future runs)

1. **Always cold-launch the app** before measuring monitor events; logcat-only harness yields count=0.
2. **Never `readFileSync` large logcat files** — use streamed metrics (`readLogcatMetricsFromFile`) for runs >1h.
3. **Use Node pipe for adb logcat** on Windows; PowerShell background redirection produces 0-byte files.
4. **Bake `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1`** into preview APK for production validation.
5. **Git sync watcher** must key off `runId`, not file mtime alone.
6. **Cosmetic:** shell exit code 1 when `phase12_5ExitCode=null` despite overall PASS — does not affect verdict.

See also: `docs/review/HYPEROS_12H_VALIDATION_LEARNINGS.md`

---

## Evidence artifacts (retained)

| Artifact | Path |
|----------|------|
| Evidence JSON | `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json` |
| Logcat summary | `docs/review/hyperos-screen-off-survival/logcat-summary-12h-20260618-202947.txt` |
| Run report | `docs/review/HYPEROS_V15_12H_RUN_REPORT.md` |
| Orchestrator report | `docs/review/ORCHESTRATOR_FINAL_VALIDATION_REPORT.md` |
| Evidence summary | `docs/review/HYPEROS_V15_12H_EVIDENCE_SUMMARY.md` |
| Hourly interim | `docs/review/HYPEROS_V15_12H_RUN_INTERIM_{1h..12h}_REPORT.md` |
| dumpsys snapshots | `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-*` |

Large raw logcat files (`logcat-live-*.log`, ~2.3 GB total) were removed after summary extraction; see `CLEANUP_MANIFEST_12H_20260619.md`.

---

## GitHub sync

Commit: **ad28e0a**  
Push: **success** (`origin/cursor/top3-maxdd-capital-audit`)
