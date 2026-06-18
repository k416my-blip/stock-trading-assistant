# HyperOS V15 12h Screen-Off Run — Interim Report — 8h

Updated: **2026-06-19 04:35:52 MYT**  
Purpose: **12h production validation (APP_GO + ORCHESTRATOR_GO chain)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260618-202947`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | active (file >512MB) |
| run-scoped logcat bytes | 752371960 |
| polls completed | 32 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-18 20:29:47 MYT |
| Elapsed | ~486 min |
| Completion | ~68% |
| Expected end (MYT) | 2026-06-19 08:30:03 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 30438 (baseline 30438) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 109 |
| 4 | Price (latest poll total) | 60 |
| 5 | News (latest poll total) | 78 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 30438 | 7 | 3 | 6 | Y | Y | Awake |
| 30m | 30438 | 10 | 5 | 7 | Y | Y | Awake |
| 45m | 30438 | 13 | 6 | 8 | Y | Y | Awake |
| 60m | 30438 | 13 | 6 | 8 | Y | Y | Dozing |
| 75m | 30438 | 16 | 8 | 12 | Y | Y | Dozing |
| 91m | 30438 | 20 | 10 | 15 | Y | Y | Dozing |
| 106m | 30438 | 24 | 12 | 17 | Y | Y | Dozing |
| 121m | 30438 | 28 | 14 | 19 | Y | Y | Dozing |
| 136m | 30438 | 30 | 16 | 23 | Y | Y | Dozing |
| 151m | 30438 | 34 | 18 | 25 | Y | Y | Awake |
| 166m | 30438 | 37 | 20 | 27 | Y | Y | Awake |
| 181m | 30438 | 40 | 22 | 29 | Y | Y | Awake |
| 196m | 30438 | 45 | 25 | 35 | Y | Y | Awake |
| 212m | 30438 | 48 | 26 | 35 | Y | Y | Dozing |
| 227m | 30438 | 52 | 28 | 38 | Y | Y | Dozing |
| 242m | 30438 | 56 | 30 | 40 | Y | Y | Awake |
| 257m | 30438 | 62 | 33 | 44 | Y | Y | Awake |
| 272m | 30438 | 65 | 34 | 45 | Y | Y | Awake |
| 288m | 30438 | 65 | 34 | 45 | Y | Y | Dozing |
| 303m | 30438 | 69 | 37 | 49 | Y | Y | Awake |
| 318m | 30438 | 73 | 39 | 53 | Y | Y | Dozing |
| 333m | 30438 | 77 | 41 | 55 | Y | Y | Dozing |
| 348m | 30438 | 81 | 43 | 57 | Y | Y | Dozing |
| 364m | 30438 | 85 | 45 | 60 | Y | Y | Awake |
| 379m | 30438 | 88 | 47 | 63 | Y | Y | Awake |
| 394m | 30438 | 91 | 49 | 65 | Y | Y | Awake |
| 409m | 30438 | 94 | 51 | 67 | Y | Y | Awake |
| 425m | 30438 | 97 | 53 | 70 | Y | Y | Awake |
| 440m | 30438 | 100 | 55 | 73 | Y | Y | Awake |
| 455m | 30438 | 103 | 57 | 75 | Y | Y | Awake |
| 470m | 30438 | 106 | 59 | 77 | Y | Y | Awake |
| 486m | 30438 | 109 | 60 | 78 | Y | Y | Awake |

## PID timeline

- **15m** · PID=30438 · 2026-06-18T12:45:14.176Z
- **30m** · PID=30438 · 2026-06-18T13:00:18.086Z
- **45m** · PID=30438 · 2026-06-18T13:15:22.373Z
- **60m** · PID=30438 · 2026-06-18T13:30:26.653Z
- **75m** · PID=30438 · 2026-06-18T13:45:36.967Z
- **91m** · PID=30438 · 2026-06-18T14:00:42.157Z
- **106m** · PID=30438 · 2026-06-18T14:15:47.643Z
- **121m** · PID=30438 · 2026-06-18T14:30:53.519Z
- **136m** · PID=30438 · 2026-06-18T14:46:04.507Z
- **151m** · PID=30438 · 2026-06-18T15:01:11.939Z
- **166m** · PID=30438 · 2026-06-18T15:16:19.597Z
- **181m** · PID=30438 · 2026-06-18T15:31:28.303Z
- **196m** · PID=30438 · 2026-06-18T15:46:40.583Z
- **212m** · PID=30438 · 2026-06-18T16:01:49.676Z
- **227m** · PID=30438 · 2026-06-18T16:16:59.524Z
- **242m** · PID=30438 · 2026-06-18T16:32:09.819Z
- **257m** · PID=30438 · 2026-06-18T16:47:23.683Z
- **272m** · PID=30438 · 2026-06-18T17:02:35.225Z
- **288m** · PID=30438 · 2026-06-18T17:17:46.755Z
- **303m** · PID=30438 · 2026-06-18T17:32:59.358Z
- **318m** · PID=30438 · 2026-06-18T17:48:14.731Z
- **333m** · PID=30438 · 2026-06-18T18:03:27.177Z
- **348m** · PID=30438 · 2026-06-18T18:18:39.940Z
- **364m** · PID=30438 · 2026-06-18T18:33:53.253Z
- **379m** · PID=30438 · 2026-06-18T18:49:08.828Z
- **394m** · PID=30438 · 2026-06-18T19:04:21.053Z
- **409m** · PID=30438 · 2026-06-18T19:19:34.270Z
- **425m** · PID=30438 · 2026-06-18T19:34:48.150Z
- **440m** · PID=30438 · 2026-06-18T19:50:05.494Z
- **455m** · PID=30438 · 2026-06-18T20:05:19.548Z
- **470m** · PID=30438 · 2026-06-18T20:20:33.858Z
- **486m** · PID=30438 · 2026-06-18T20:35:49.271Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-60m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-75m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-91m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-106m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-121m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-136m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-151m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-166m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-181m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-196m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-212m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-227m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-242m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-257m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-272m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-288m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-303m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-318m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-333m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-348m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-364m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-379m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-394m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-409m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-425m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-440m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-455m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-470m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-486m-services.txt`

## checkpoint.json

- priceRefreshRuns: 29
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
