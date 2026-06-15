# HyperOS v10 30m Screen-Off Run Report

## Executive summary: **NO-GO**

| Field | Value |
|-------|-------|
| Stage | 30m |
| Test window (MYT) | 2026-06-16 06:28:21 MYT → 2026-06-16 06:59:21 MYT |
| APK | preview-v10.apk (versionCode 10) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | df866d749e7ed0510868696e1d1b425a0c1b18dd |
| phase12-5 | 0.5h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | PASS | wakefulness polls; screen-off enforce 2x |
| 2 | PID maintenance | PASS | baseline 8047, lost events 0, final 8047 |
| 3 | Heartbeat continuation | PASS | 67 (expected ~4) |
| 4 | Twelve Data / price | PASS | price_update lines 24 |
| 5 | News fetch | PASS | news_fetch lines 30 |
| 6 | Foreground service | FAIL | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | PASS | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 8047 | -2 | 1 | 2 | N | Y | Awake |
| 30m | 8047 | 2 | 1 | -2 | N | Y | Awake |

## PID timeline

- **15m** · PID=8047 · 2026-06-15T22:43:45.484Z
- **30m** · PID=8047 · 2026-06-15T22:58:49.018Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-062821-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-062821-30m-services.txt`

## checkpoint.json summary

- priceRefreshRuns: 2
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

Summary file: `docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260616-062821.txt`

## Known issues / infra

- APK reinstall skipped (versionCode=10, apk=preview-v10.apk)

## GitHub sync

_(filled after commit/push)_
