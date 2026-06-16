# HyperOS V15 3h Screen-Off Run — Interim Report (1h)

Updated: **2026-06-16 11:53:03 MYT**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260616-105222`

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-16 10:52:22 MYT |
| Elapsed | ~60 min |
| Completion | ~33% |
| Expected end (MYT) | TBD |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 11124 (baseline 11124) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 3 |
| 4 | Price (latest poll total) | 2 |
| 5 | News (latest poll total) | 1 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 11124 | 1 | 1 | 2 | Y | Y | Awake |
| 30m | 11124 | 3 | 2 | 2 | Y | Y | Awake |
| 45m | 11124 | 3 | 2 | 2 | Y | Y | Awake |
| 60m | 11124 | 3 | 2 | 1 | Y | Y | Awake |

## PID timeline

- **15m** · PID=11124 · 2026-06-16T03:07:48.223Z
- **30m** · PID=11124 · 2026-06-16T03:22:52.455Z
- **45m** · PID=11124 · 2026-06-16T03:37:57.720Z
- **60m** · PID=11124 · 2026-06-16T03:53:01.654Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-105222-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-105222-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-105222-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-105222-60m-services.txt`

## checkpoint.json

- priceRefreshRuns: 3
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 3h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-3h-evidence.json`
