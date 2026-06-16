# HyperOS V15 3h RERUN Report

## Executive summary

| Axis | Verdict |
|------|---------|
| **Orchestrator fix validation** | **PARTIAL_PASS** |
| App screen-off (informational) | **NO-GO** |

**Purpose:** Validate `6dc5e63` orchestrator fixes — not primary app GO gate.  
**Run ID:** `20260616-143009`  
**Window (MYT):** 2026-06-16 14:30:09 MYT → 16/06/2026, 17:34:51 MYT  
**APK:** preview-v15.apk (versionCode 15)  
**Device:** FYRWXSNNAIOR9DCM  
**Fix commit:** 6dc5e63  
**Script commit:** 274ef10ac270ea6534404207c3cd0cd3daf5303d

## Orchestrator validation (primary)

| # | Check | Result |
|---|-------|--------|
| 1 | writeEvidence errors | **PASS** |
| 2 | auto-finalize | **PASS** |
| 3 | run-scoped logcat | **FAIL** (0 bytes) |
| 4 | heartbeat final count | **PASS** (2; poll peak 6) |
| 5 | price_update final count | 1 (poll peak 2) |
| 6 | evidence.json saved | **PASS** |
| 7 | polls 12/12 | **PASS** (12) |

## App metrics (informational)

| Item | Value |
|------|-------|
| PID | 2506 → 2506; lost 0 |
| FGS / WL polls | 12/12 / 12/12 |
| FATAL / ANR | 0 / 0 |
| Heartbeat (live log) | 2 |
| price_update | 1 |
| news_fetch | 2 |

## Poll timeline (15 min)

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 2506 | 1 | 1 | 2 | Y | Y | Awake |
| 30m | 2506 | 2 | 0 | 0 | Y | Y | Dozing |
| 45m | 2506 | 6 | 2 | 2 | Y | Y | Awake |
| 60m | 2506 | 3 | 2 | 2 | Y | Y | Awake |
| 75m | 2506 | 4 | 2 | 1 | Y | Y | Awake |
| 91m | 2506 | 3 | 1 | 0 | Y | Y | Awake |
| 106m | 2506 | 0 | 0 | 0 | Y | Y | Dozing |
| 121m | 2506 | 0 | 2 | 6 | Y | Y | Dozing |
| 136m | 2506 | 0 | 1 | 3 | Y | Y | Dozing |
| 151m | 2506 | 4 | 2 | 2 | Y | Y | Dozing |
| 166m | 2506 | 4 | 2 | 2 | Y | Y | Awake |
| 181m | 2506 | 5 | 2 | 2 | Y | Y | Awake |

## PID timeline

- **15m** · PID=2506 · 2026-06-16T06:45:33.005Z
- **30m** · PID=2506 · 2026-06-16T07:00:34.932Z
- **45m** · PID=2506 · 2026-06-16T07:15:43.001Z
- **60m** · PID=2506 · 2026-06-16T07:30:46.876Z
- **75m** · PID=2506 · 2026-06-16T07:45:55.741Z
- **91m** · PID=2506 · 2026-06-16T08:00:59.250Z
- **106m** · PID=2506 · 2026-06-16T08:16:01.325Z
- **121m** · PID=2506 · 2026-06-16T08:31:03.641Z
- **136m** · PID=2506 · 2026-06-16T08:46:09.388Z
- **151m** · PID=2506 · 2026-06-16T09:01:12.838Z
- **166m** · PID=2506 · 2026-06-16T09:16:17.099Z
- **181m** · PID=2506 · 2026-06-16T09:31:23.783Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-60m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-75m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-91m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-106m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-121m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-136m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-151m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-166m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-143009-181m-services.txt`

## checkpoint.json

- priceRefreshRuns: 10
- pidLostEvents: 1
- fatal: 0
- anr: 0
- endedAt: null

## Logcat summary

`docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260616-143009.txt`

## Related reports

- `docs/review/ORCHESTRATOR_FIX_VALIDATION_REPORT.md`
- `docs/review/APP_GO_ORCHESTRATOR_FAIL_REPORT.md` (original run analysis)

## GitHub sync

| Commit | Content | Push |
|--------|---------|------|
| `58ca9aa` | Final RERUN + ORCHESTRATOR_FIX_VALIDATION reports | **OK** → `cursor/top3-maxdd-capital-audit` |
