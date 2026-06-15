# HyperOS v9 3h Screen-Off Run Report

## Executive summary: **NO-GO** (infra — device not connected)

The 3-hour screen-off reliability test **did not run**. \FYRWXSNNAIOR9DCM\ was online at session preflight but dropped off USB/adb before orchestration could install, enable survival, or start the 3h window. Orchestration (\scripts/verify-hyperos-v9-3h-screen-off.mjs\) waited ~30 minutes for reconnection; \db devices\ remained empty.

| Field | Value |
|-------|-------|
| Attempt window (MYT) | 2026-06-15 16:52:50 → 17:42:37 (orchestrator exit) |
| Planned duration | 3h screen-off after \survival_enabled\ |
| APK | \rtifacts/preview-v9.apk\ (versionCode 9 on device when last seen) |
| Device | FYRWXSNNAIOR9DCM (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit (at attempt) | 9d112f4178cfd75f805b8da11e03585af750c0bb |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | **FAIL** | Not started — no baseline PID |
| 2 | PID maintenance | **FAIL** | N/A |
| 3 | Heartbeat continuation | **FAIL** | N/A |
| 4 | Twelve Data / price | **FAIL** | N/A |
| 5 | News fetch | **FAIL** | N/A |
| 6 | Foreground service | **FAIL** | N/A |
| 7 | WakeLock | **FAIL** | N/A |

## Poll timeline (15 min)

_No polls — test never entered run phase._

## checkpoint.json summary

_Not produced (phase12-5 not started)._

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | 0 |
| ANR | 0 |
| [12H-MONITOR] heartbeat | 0 |
| price_update | 0 |
| news_fetch | 0 |

Summary file: \docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260615-174500.txt\

## Known issues / infra notes

- USB/adb: \db devices\ empty from ~16:54 MYT through orchestrator exit (~17:42 MYT). \db kill-server\ / \db start-server\ did not restore the device.
- First orchestration attempt (PID 10344) failed immediately when the device disappeared right after launch.
- Second attempt (PID 2060) included a 30-minute \waitForDevice\ loop; still no device.
- **Remediation:** Reconnect USB (file transfer mode), confirm \db devices\ shows \device\, disable USB power saving on phone/PC, then re-run:
  \\\powershell
  $env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
  $env:PHASE12_5_RUNTIME_MODE="apk"
  $env:PHASE12_5_HOURS="3"
  node scripts/verify-hyperos-v9-3h-screen-off.mjs
  \\\
- Evidence: \docs/review/hyperos-screen-off-survival/hyperos-v9-3h-evidence.json\ (runId \20260615-171054\).

## GitHub sync

- **Commit:** `9c90d8d` — docs: HyperOS v9 3h screen-off survival run report
- **Push:** success to `origin/cursor/top3-maxdd-capital-audit` (`9d112f4..9c90d8d`)
- **Remote:** https://github.com/k416my-blip/stock-trading-assistant/tree/cursor/top3-maxdd-capital-audit
