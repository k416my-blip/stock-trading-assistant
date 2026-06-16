# HyperOS V15 12h Screen-Off Run — Interim Report — 1h

Updated: **2026-06-16 22:07:23 MYT**  
Purpose: **Screen-off survival**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260616-210645`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| run-scoped logcat bytes | 126600314 |
| polls completed | 4 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-16 21:06:45 MYT |
| Elapsed | ~60 min |
| Completion | ~8% |
| Expected end (MYT) | 2026-06-17 09:07:00 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 11698 (baseline 11698) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 19 |
| 4 | Price (latest poll total) | 9 |
| 5 | News (latest poll total) | 11 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 11698 | 8 | 3 | 6 | Y | Y | Awake |
| 30m | 11698 | 13 | 5 | 8 | Y | Y | Awake |
| 45m | 11698 | 16 | 7 | 10 | Y | Y | Awake |
| 60m | 11698 | 19 | 9 | 11 | Y | Y | Awake |

## PID timeline

- **15m** · PID=11698 · 2026-06-16T13:22:08.597Z
- **30m** · PID=11698 · 2026-06-16T13:37:11.831Z
- **45m** · PID=11698 · 2026-06-16T13:52:14.875Z
- **60m** · PID=11698 · 2026-06-16T14:07:17.849Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-210645-60m-services.txt`

## checkpoint.json

- priceRefreshRuns: 3
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
