# HyperOS V15 6h Orchestrator Validation — Interim Report — 5h

Updated: **2026-06-18 00:23:59 MYT**  
Purpose: **Streaming metrics orchestrator validation (post 780118f)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260617-192027`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | active (file >512MB) |
| run-scoped logcat bytes | 582844440 |
| polls completed | 20 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-17 19:20:27 MYT |
| Elapsed | ~303 min |
| Completion | ~84% |
| Expected end (MYT) | 2026-06-18 01:20:44 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 13512 (baseline 13512) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 74 |
| 4 | Price (latest poll total) | 41 |
| 5 | News (latest poll total) | 54 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 13512 | 5 | 2 | 4 | Y | Y | Awake |
| 30m | 13512 | 11 | 4 | 6 | Y | Y | Awake |
| 45m | 13512 | 14 | 6 | 8 | Y | Y | Awake |
| 60m | 13512 | 17 | 8 | 9 | Y | Y | Awake |
| 76m | 13512 | 22 | 10 | 14 | Y | Y | Awake |
| 91m | 13512 | 24 | 12 | 17 | Y | Y | Dozing |
| 106m | 13512 | 28 | 14 | 19 | Y | Y | Dozing |
| 121m | 13512 | 33 | 17 | 21 | Y | Y | Awake |
| 136m | 13512 | 36 | 19 | 26 | Y | Y | Dozing |
| 151m | 13512 | 40 | 21 | 28 | Y | Y | Awake |
| 166m | 13512 | 43 | 23 | 30 | Y | Y | Awake |
| 181m | 13512 | 46 | 25 | 32 | Y | Y | Awake |
| 197m | 13512 | 49 | 28 | 36 | Y | Y | Awake |
| 212m | 13512 | 51 | 30 | 39 | Y | Y | Awake |
| 227m | 13512 | 54 | 32 | 41 | Y | Y | Awake |
| 242m | 13512 | 57 | 34 | 43 | Y | Y | Awake |
| 257m | 13512 | 65 | 37 | 49 | Y | Y | Awake |
| 273m | 13512 | 68 | 39 | 50 | Y | Y | Awake |
| 288m | 13512 | 71 | 40 | 50 | Y | Y | Awake |
| 303m | 13512 | 74 | 41 | 54 | Y | Y | Awake |

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

## checkpoint.json

- priceRefreshRuns: 18
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 6h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-6h-evidence.json`
