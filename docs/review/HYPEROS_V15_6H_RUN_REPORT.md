# HyperOS V15 6h Orchestrator Validation Report

## Executive summary: **GO** (streaming orchestrator validation)

| Field | Value |
|-------|-------|
| Stage | 6h |
| Test window (MYT) | 2026-06-17 19:20:27 MYT → 2026-06-18 01:32:27 MYT |
| APK | preview-v15.apk (versionCode 15) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | ab55de8986a7a691935432b48bf1d7cefada96bd |
| phase12-5 | 6h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | PASS | wakefulness polls; screen-off enforce 21x |
| 2 | PID maintenance | PASS | baseline 13512, lost events 0, final 13512 |
| 3 | Heartbeat continuation | PASS | 89 (expected ~23) |
| 4 | Twelve Data / price | PASS | price_update lines 50 |
| 5 | News fetch | PASS | news_fetch lines 66 |
| 6 | Foreground service | PASS | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | PASS | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 13512 | 1 | 1 | 4 | Y | Y | Awake |
| 30m | 13512 | 6 | 2 | 2 | Y | Y | Awake |
| 45m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 60m | 13512 | 3 | 2 | 1 | Y | Y | Awake |
| 76m | 13512 | 5 | 2 | 5 | Y | Y | Awake |
| 91m | 13512 | 2 | 2 | 3 | Y | Y | Dozing |
| 106m | 13512 | 4 | 2 | 2 | Y | Y | Dozing |
| 121m | 13512 | 5 | 3 | 2 | Y | Y | Awake |
| 136m | 13512 | 3 | 2 | 5 | Y | Y | Dozing |
| 151m | 13512 | 4 | 2 | 2 | Y | Y | Awake |
| 166m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 181m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 197m | 13512 | 3 | 3 | 4 | Y | Y | Awake |
| 212m | 13512 | 2 | 2 | 3 | Y | Y | Awake |
| 227m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 242m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 257m | 13512 | 8 | 3 | 6 | Y | Y | Awake |
| 273m | 13512 | 3 | 2 | 1 | Y | Y | Awake |
| 288m | 13512 | 3 | 1 | 0 | Y | Y | Awake |
| 303m | 13512 | 3 | 1 | 4 | Y | Y | Awake |
| 318m | 13512 | 5 | 2 | 4 | Y | Y | Awake |
| 333m | 13512 | 3 | 2 | 2 | Y | Y | Awake |
| 349m | 13512 | 2 | 2 | 2 | Y | Y | Awake |
| 364m | 13512 | 3 | 2 | 3 | Y | Y | Awake |

## PID timeline

- **15m** · PID=13512 · 2026-06-17T11:35:53.892Z
- **30m** · PID=13512 · 2026-06-17T11:50:58.848Z
- **45m** · PID=13512 · 2026-06-17T12:06:04.209Z
- **60m** · PID=13512 · 2026-06-17T12:21:09.286Z
- **76m** · PID=13512 · 2026-06-17T12:36:19.996Z
- **91m** · PID=13512 · 2026-06-17T12:51:25.641Z
- **106m** · PID=13512 · 2026-06-17T13:06:31.774Z
- **121m** · PID=13512 · 2026-06-17T13:21:38.872Z
- **136m** · PID=13512 · 2026-06-17T13:36:48.995Z
- **151m** · PID=13512 · 2026-06-17T13:51:57.366Z
- **166m** · PID=13512 · 2026-06-17T14:07:06.167Z
- **181m** · PID=13512 · 2026-06-17T14:22:15.665Z
- **197m** · PID=13512 · 2026-06-17T14:37:28.885Z
- **212m** · PID=13512 · 2026-06-17T14:52:39.411Z
- **227m** · PID=13512 · 2026-06-17T15:07:50.751Z
- **242m** · PID=13512 · 2026-06-17T15:23:02.672Z
- **257m** · PID=13512 · 2026-06-17T15:38:18.256Z
- **273m** · PID=13512 · 2026-06-17T15:53:31.103Z
- **288m** · PID=13512 · 2026-06-17T16:08:43.631Z
- **303m** · PID=13512 · 2026-06-17T16:23:56.529Z
- **318m** · PID=13512 · 2026-06-17T16:39:12.508Z
- **333m** · PID=13512 · 2026-06-17T16:54:25.699Z
- **349m** · PID=13512 · 2026-06-17T17:09:39.483Z
- **364m** · PID=13512 · 2026-06-17T17:24:54.307Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-60m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-76m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-91m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-106m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-121m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-136m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-151m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-166m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-181m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-197m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-212m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-227m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-242m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-257m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-273m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-288m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-303m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-318m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-333m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-349m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260617-192027-364m-services.txt`

## checkpoint.json summary

- priceRefreshRuns: 22
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | 0 |
| ANR | 0 |
| [12H-MONITOR] heartbeat | 89 |
| survival_enabled / status | seen / 85 |
| price_update | 50 |
| news_fetch | 66 |

Summary file: `docs/review/hyperos-screen-off-survival/logcat-summary-6h-20260617-192027.txt`

## Known issues / infra

- APK reinstall skipped (versionCode=15, apk=preview-v15.apk)

## GitHub sync

_(filled after commit/push)_
