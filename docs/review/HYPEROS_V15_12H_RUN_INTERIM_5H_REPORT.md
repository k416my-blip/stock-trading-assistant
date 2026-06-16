# HyperOS V15 12h Screen-Off Run — Interim Report — 5h

Updated: **2026-06-17 02:08:56 MYT**  
Purpose: **Screen-off survival**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260616-210645`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| run-scoped logcat bytes | 508338687 |
| polls completed | 20 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-16 21:06:45 MYT |
| Elapsed | ~302 min |
| Completion | ~42% |
| Expected end (MYT) | 2026-06-17 09:07:00 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 11698 (baseline 11698) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 77 |
| 4 | Price (latest poll total) | 40 |
| 5 | News (latest poll total) | 55 |
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
| 196m | 11698 | 54 | 27 | 39 | Y | Y | Awake |
| 211m | 11698 | 57 | 29 | 40 | Y | Y | Awake |
| 226m | 11698 | 60 | 30 | 41 | Y | Y | Awake |
| 241m | 11698 | 63 | 31 | 41 | Y | Y | Awake |
| 256m | 11698 | 68 | 34 | 49 | Y | Y | Awake |
| 272m | 11698 | 71 | 36 | 51 | Y | Y | Awake |
| 287m | 11698 | 74 | 38 | 53 | Y | Y | Awake |
| 302m | 11698 | 77 | 40 | 55 | Y | Y | Awake |

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
- **196m** · PID=11698 · 2026-06-16T16:23:08.597Z
- **211m** · PID=11698 · 2026-06-16T16:38:13.602Z
- **226m** · PID=11698 · 2026-06-16T16:53:18.816Z
- **241m** · PID=11698 · 2026-06-16T17:08:24.016Z
- **256m** · PID=11698 · 2026-06-16T17:23:33.361Z
- **272m** · PID=11698 · 2026-06-16T17:38:39.269Z
- **287m** · PID=11698 · 2026-06-16T17:53:45.439Z
- **302m** · PID=11698 · 2026-06-16T18:08:51.767Z

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

- priceRefreshRuns: 18
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
