# Twelve-Hour Test Start Readiness Report

**Date:** 2026-06-16 (updated 2026-06-19)  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**APK:** `artifacts/preview-v15.apk` (versionCode 15)  
**Device:** FYRWXSNNAIOR9DCM (Redmi Note 13 Pro / HyperOS)

> **Superseded outcome:** 12h production validation **GO** — run `20260618-202947`.  
> See `FINAL_12H_VALIDATION_REPORT.md` and `HYPEROS_12H_VALIDATION_LEARNINGS.md`.

---

## Verdict: **GO** (completed 2026-06-19)

Historical gate below was **CONDITIONAL GO** pending 30m logcat PASS — all gates since resolved.

| Gate | Status | Evidence |
|------|--------|----------|
| PID maintenance | **PASS** | 1h GO + 3h RERUN: 0 PID lost events |
| FGS maintenance | **PASS** | LongRunForegroundService on all RERUN polls |
| WakeLock maintenance | **PASS** | partial wakelock + survival_status on all polls |
| Crash (FATAL) | **PASS** | App process survived; orchestrator checkpoint FATAL is tooling noise* |
| ANR | **PASS** | 0 across runs |
| Orchestrator finalize | **PASS** | RERUN: no writeEvidence crash at 151m |
| Run-scoped logcat | **PENDING** | Fix applied; 30m validation required |

\*RERUN report lists `fatal: 1` in checkpoint.json from phase12-5 tooling scan of rotated logcat, not app process death (PID 2506 stable through 181m).

---

## App survival evidence chain

| Run | Run ID | Duration | PID | PID lost | FGS | WL | Notes |
|-----|--------|----------|-----|----------|-----|-----|-------|
| 1h screen-off GO | 20260616-091138 | ~1h | 27511 | 0 | Y | Y | 67 HB (legacy live log) |
| 3h original | 20260616-105222 | ~151m+crash | 11124 | 0 | Y | Y | App OK; orchestrator writeEvidence FAIL |
| 3h RERUN | 20260616-143009 | 3h15m | 2506 | 0 | Y | Y | 12/12 polls; APP_GO |

**Conclusion:** Preview v15 meets screen-off survival requirements for PID, FGS, WakeLock, and process continuity. HyperOS aggressive doze did not kill the app across 3h+ with whitelist + native survival stack.

---

## Remaining blocker (orchestrator only)

Only **run-scoped logcat capture** failed on RERUN. Without a growing live log:

- Final heartbeat/price counts are wrong
- 12h post-run audit cannot be automated reliably

**Fix:** `hyperos-logcat-capture.mjs` (Node pipe).  
**Validation:** 30m `verify-hyperos-logcat-capture-30m.mjs` → see `LOGCAT_CAPTURE_30M_VALIDATION_REPORT.md`.

---

## 12h start decision

| Condition | Decision |
|-----------|----------|
| 30m logcat validation **PASS** | **AUTHORIZED** — start `PHASE12_5_HOURS=12` with fixed orchestrator |
| 30m logcat validation **FAIL** | **HOLD** — do not start 12h until capture proven |

### Recommended launch command (after 30m PASS)

```powershell
$env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
$env:PHASE12_5_HOURS="12"
$env:PHASE12_5_SKIP_APK_REINSTALL="1"
node scripts/verify-hyperos-v9-3h-screen-off.mjs
```

---

## GitHub sync

Commit: **fde568d**  
Push: **success** (`origin/cursor/top3-maxdd-capital-audit`)
