# HyperOS v9 3h Screen-Off Run Report

## Executive summary: **NO-GO**

| Field | Value |
|-------|-------|
| Test window (MYT) | 2026-06-15 20:36:07 MYT 竊・2026-06-15 23:37:25 MYT |
| APK | preview-v9.apk (versionCode 9) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | 1216bf7fc3992c93c88137ee46a2d3c26c32b894 |
| phase12-5 | 3h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | PASS | wakefulness polls; screen-off enforce 6x |
| 2 | PID maintenance | FAIL | baseline 7644, lost events 2, final null |
| 3 | Heartbeat continuation | FAIL | 0 (expected ~34) |
| 4 | Twelve Data / price | PASS | price_update lines 24 |
| 5 | News fetch | PASS | news_fetch lines 30 |
| 6 | Foreground service | FAIL | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | PASS | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBﾎ・| priceﾎ・| newsﾎ・| FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 7644 | 0 | 1 | 4 | N | Y | Dozing |
| 30m | 7644 | 0 | 1 | -2 | N | Y | Awake |
| 45m | 7644 | 0 | 0 | 0 | N | Y | Awake |
| 60m | 7644 | 0 | 0 | 0 | N | Y | Awake |
| 75m | 7644 | 0 | 0 | -1 | N | Y | Dozing |
| 90m | 7644 | 0 | 0 | -1 | N | Y | Dozing |
| 105m | 7644 | 0 | -1 | 5 | N | Y | Dozing |
| 121m | 7644 | 0 | -1 | -3 | N | Y | Dozing |
| 136m | 7644 | 0 | 1 | 0 | N | Y | Dozing |
| 151m | 7644 | 0 | 1 | 0 | N | Y | Awake |
| 166m | 窶・| 0 | -2 | -2 | N | Y | Dozing |
| 181m | 窶・| 0 | 0 | 0 | N | Y | Dozing |

## checkpoint.json summary

- priceRefreshRuns: 9
- pidLostEvents: 1
- fatal: 0
- anr: 0

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | 0 |
| ANR | 0 |
| [12H-MONITOR] heartbeat | 0 |
| survival_enabled / status | seen / 2 |
| price_update | 24 |
| news_fetch | 30 |

Summary file: `docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260615-203607.txt`

## Known issues / infra

- APK reinstall skipped (versionCode=9)

- Heartbeat logcat counter in orchestrator matches literal `[12H-MONITOR] heartbeat`; React Native logs split tag/message so table shows 0 while `'heartbeat'` events occurred (see logcat summary samples).
- PID lost twice near end of window (166m/181m polls); `LongRunForegroundService` absent in all 12 dumpsys polls despite WakeLock signals.

## GitHub sync

Pushed `e902cf6` to `origin/cursor/top3-maxdd-capital-audit`.
