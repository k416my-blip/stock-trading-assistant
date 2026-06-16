# HyperOS V15 3h RERUN Report

## Executive summary: **NO-GO** (orchestrator validation)

| Field | Value |
|-------|-------|
| Stage | 3h |
| Test window (MYT) | 2026-06-16 14:30:09 MYT → 2026-06-16 19:20:04 MYT |
| APK | preview-v15.apk (versionCode 15) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | cc0320bfd479f763a55ba41add40454a949bd413 |
| phase12-5 | 3h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | PASS | wakefulness polls; screen-off enforce 8x |
| 2 | PID maintenance | PASS | baseline 2506, lost events 0, final 2506 |
| 3 | Heartbeat continuation | FAIL | 0 (expected ~34) |
| 4 | Twelve Data / price | FAIL | price_update lines 0 |
| 5 | News fetch | FAIL | news_fetch lines 0 |
| 6 | Foreground service | PASS | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | PASS | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 2506 | -2 | 0 | 2 | Y | Y | Awake |
| 30m | 2506 | 1 | -1 | -2 | Y | Y | Dozing |
| 45m | 2506 | 4 | 2 | 2 | Y | Y | Awake |
| 60m | 2506 | -3 | 0 | 0 | Y | Y | Awake |
| 75m | 2506 | 1 | 0 | -1 | Y | Y | Awake |
| 91m | 2506 | -1 | -1 | -1 | Y | Y | Awake |
| 106m | 2506 | -3 | -1 | 0 | Y | Y | Dozing |
| 121m | 2506 | 0 | 2 | 6 | Y | Y | Dozing |
| 136m | 2506 | 0 | -1 | -3 | Y | Y | Dozing |
| 151m | 2506 | 4 | 1 | -1 | Y | Y | Dozing |
| 166m | 2506 | 0 | 0 | 0 | Y | Y | Awake |
| 181m | 2506 | 1 | 0 | 0 | Y | Y | Awake |

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

## checkpoint.json summary

- priceRefreshRuns: 10
- pidLostEvents: 1
- fatal: 1
- anr: 0

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | 1 |
| ANR | 0 |
| [12H-MONITOR] heartbeat | 0 |
| survival_enabled / status | seen / 0 |
| price_update | 0 |
| news_fetch | 0 |

Summary file: `docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260616-143009.txt`

## Known issues / infra

- APK reinstall skipped (versionCode=15, apk=preview-v15.apk)

## GitHub sync

_(filled after commit/push)_
