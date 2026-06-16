# HyperOS V15 12h Screen-Off Run Report

## Verdict: **PARTIAL_GO_APP** (interrupted at ~5h)

| Field | Value |
|-------|-------|
| Run ID | `20260616-210645` |
| Window (MYT) | 2026-06-16 21:06:45 MYT → 17/06/2026, 02:57:16 MYT |
| Planned | 12h |
| Actual elapsed | ~302 min (20 polls) |
| APK | preview-v15.apk (versionCode 15) |
| Device | FYRWXSNNAIOR9DCM |
| Interrupt | orchestrator `ERR_STRING_TOO_LONG` on 574MB logcat (fixed: streamed counts) |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | PID maintenance | PASS | baseline 11698, lost 0, final 11698 |
| 2 | Heartbeat continuation | PASS | 88 (poll peak 77) |
| 3 | Twelve Data / price | PASS | price_update 45 |
| 4 | News fetch | PASS | news_fetch 62 |
| 5 | Foreground service | PASS | polls with FGS |
| 6 | WakeLock | PASS | polls with WL |
| 7 | Crash / ANR | see checkpoint | checkpoint below |

## Orchestrator

| Check | Result |
|-------|--------|
| run-scoped logcat | PASS (574520013 bytes) |
| auto-finalize in-run | **FAIL** (crash ~5h) |
| evidence.json | PASS (recovered) |
| streamed finalize | PASS (this report) |

## Event counts (streamed from live log)

| Pattern | Count |
|---------|-------|
| 12H-MONITOR | **520** |
| heartbeat | **88** |
| price_update | **45** |
| news_fetch | **62** |
| survival_health_ok | **70** |

## PID timeline

- **15m** · PID=11698
- **30m** · PID=11698
- **45m** · PID=11698
- **60m** · PID=11698
- **75m** · PID=11698
- **90m** · PID=11698
- **105m** · PID=11698
- **121m** · PID=11698
- **136m** · PID=11698
- **151m** · PID=11698
- **166m** · PID=11698
- **181m** · PID=11698
- **196m** · PID=11698
- **211m** · PID=11698
- **226m** · PID=11698
- **241m** · PID=11698
- **256m** · PID=11698
- **272m** · PID=11698
- **287m** · PID=11698
- **302m** · PID=11698

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-60m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-75m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-90m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-105m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-121m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-136m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-151m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-166m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-181m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-196m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-211m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-226m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-241m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-256m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-272m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-287m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-302m-services.txt`

## checkpoint.json

- priceRefreshRuns: 20
- pidLostEvents: 0
- fatal: 0
- anr: 0

## logcat summary

`docs/review/hyperos-screen-off-survival/logcat-summary-12h-20260616-210645.txt`

## GitHub sync

Commit: **651eb6915b293c1123d949898d2951fac4f9f66d**
