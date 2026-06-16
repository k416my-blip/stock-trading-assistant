# HyperOS V15 12h Screen-Off Run — Interim Report — 3h

Updated: **2026-06-17 00:08:03 MYT**  
Purpose: **Screen-off survival**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260616-210645`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| run-scoped logcat bytes | 307384730 |
| polls completed | 12 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-16 21:06:45 MYT |
| Elapsed | ~181 min |
| Completion | ~25% |
| Expected end (MYT) | 2026-06-17 09:07:00 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 11698 (baseline 11698) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 49 |
| 4 | Price (latest poll total) | 25 |
| 5 | News (latest poll total) | 34 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 11698 | 8 | 3 | 6 | Y | Y | Awake |
| 30m | 11698 | 13 | 5 | 8 | Y | Y | Awake |
| 45m | 11698 | 16 | 7 | 10 | Y | Y | Awake |
| 60m | 11698 | 19 | 9 | 11 | Y | Y | Awake |
| 75m | 11698 | 24 | 10 | 15 | Y | Y | Awake |
| 90m | 11698 | 26 | 12 | 18 | Y | Y | Dozing |
| 105m | 11698 | 30 | 14 | 20 | Y | Y | Dozing |
| 121m | 11698 | 35 | 17 | 22 | Y | Y | Awake |
| 136m | 11698 | 40 | 19 | 28 | Y | Y | Awake |
| 151m | 11698 | 43 | 21 | 30 | Y | Y | Awake |
| 166m | 11698 | 46 | 23 | 32 | Y | Y | Awake |
| 181m | 11698 | 49 | 25 | 34 | Y | Y | Awake |

## PID timeline

- **15m** · PID=11698 · 2026-06-16T13:22:08.597Z
- **30m** · PID=11698 · 2026-06-16T13:37:11.831Z
- **45m** · PID=11698 · 2026-06-16T13:52:14.875Z
- **60m** · PID=11698 · 2026-06-16T14:07:17.849Z
- **75m** · PID=11698 · 2026-06-16T14:22:27.415Z
- **90m** · PID=11698 · 2026-06-16T14:37:30.545Z
- **105m** · PID=11698 · 2026-06-16T14:52:33.455Z
- **121m** · PID=11698 · 2026-06-16T15:07:37.619Z
- **136m** · PID=11698 · 2026-06-16T15:22:46.002Z
- **151m** · PID=11698 · 2026-06-16T15:37:49.957Z
- **166m** · PID=11698 · 2026-06-16T15:52:54.300Z
- **181m** · PID=11698 · 2026-06-16T16:08:00.138Z

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

## checkpoint.json

- priceRefreshRuns: 11
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
