# HyperOS v10 1h Screen-Off Run Report

## Executive summary: **GO**

| Field | Value |
|-------|-------|
| Stage | 1h |
| Test window (MYT) | 2026-06-16 09:11:38 MYT → 2026-06-16 10:23:04 MYT |
| APK | preview-v10.apk (versionCode 15) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | 3dbecc0f428d1ed5d17864b00b9abe184c8b07fd |
| phase12-5 | 1h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | PASS | wakefulness polls; screen-off enforce 2x |
| 2 | PID maintenance | PASS | baseline 27511, lost events 0, final 27511 |
| 3 | Heartbeat continuation | PASS | 67 (expected ~10) |
| 4 | Twelve Data / price | PASS | price_update lines 24 |
| 5 | News fetch | PASS | news_fetch lines 30 |
| 6 | Foreground service | PASS | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | PASS | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 27511 | -2 | 1 | 2 | Y | Y | Awake |
| 30m | 27511 | 2 | 0 | -2 | Y | Y | Awake |
| 45m | 27511 | -3 | -1 | 1 | Y | Y | Dozing |
| 60m | 27511 | 0 | 0 | 1 | Y | Y | Dozing |

## PID timeline

- **15m** · PID=27511 · 2026-06-16T01:27:01.119Z
- **30m** · PID=27511 · 2026-06-16T01:42:05.459Z
- **45m** · PID=27511 · 2026-06-16T01:57:09.198Z
- **60m** · PID=27511 · 2026-06-16T02:12:11.268Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-60m-services.txt`

## checkpoint.json summary

- priceRefreshRuns: 3
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | 0 |
| ANR | 0 |
| [12H-MONITOR] heartbeat | 67 |
| survival_enabled / status | seen / 4 |
| price_update | 24 |
| news_fetch | 30 |

Summary file: `docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260616-091138.txt`

## Known issues / infra

- APK reinstall skipped (versionCode=15, apk=preview-v11.apk)
- versionCode=15 (expected 11)

## GitHub sync

_(filled after commit/push)_
