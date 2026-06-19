# HyperOS V15 12h Screen-Off Run — Interim Report — 12h

Updated: **2026-06-19 08:40:51 MYT**  
Purpose: **12h production validation (APP_GO + ORCHESTRATOR_GO chain)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260618-202947`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | active (file >512MB) |
| run-scoped logcat bytes | 1106005156 |
| polls completed | 48 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-18 20:29:47 MYT |
| Elapsed | ~730 min |
| Completion | ~100% |
| Expected end (MYT) | 2026-06-19 08:30:03 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 30438 (baseline 30438) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 158 |
| 4 | Price (latest poll total) | 85 |
| 5 | News (latest poll total) | 106 |
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
| 501m | 30438 | 109 | 60 | 78 | Y | Y | Dozing |
| 516m | 30438 | 112 | 62 | 81 | Y | Y | Dozing |
| 531m | 30438 | 116 | 64 | 83 | Y | Y | Dozing |
| 547m | 30438 | 120 | 66 | 86 | Y | Y | Awake |
| 562m | 30438 | 123 | 68 | 89 | Y | Y | Dozing |
| 577m | 30438 | 127 | 70 | 91 | Y | Y | Dozing |
| 592m | 30438 | 131 | 72 | 93 | Y | Y | Awake |
| 608m | 30438 | 134 | 74 | 96 | Y | Y | Awake |
| 623m | 30438 | 137 | 75 | 97 | Y | Y | Awake |
| 638m | 30438 | 140 | 76 | 98 | Y | Y | Awake |
| 654m | 30438 | 143 | 77 | 99 | Y | Y | Awake |
| 669m | 30438 | 146 | 79 | 102 | Y | Y | Awake |
| 684m | 30438 | 149 | 81 | 104 | Y | Y | Awake |
| 700m | 30438 | 152 | 83 | 105 | Y | Y | Dozing |
| 715m | 30438 | 156 | 85 | 106 | Y | Y | Awake |
| 730m | 30438 | 158 | 85 | 106 | Y | Y | Awake |

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
- **501m** · PID=30438 · 2026-06-18T20:51:07.475Z
- **516m** · PID=30438 · 2026-06-18T21:06:22.723Z
- **531m** · PID=30438 · 2026-06-18T21:21:38.033Z
- **547m** · PID=30438 · 2026-06-18T21:36:54.774Z
- **562m** · PID=30438 · 2026-06-18T21:52:14.421Z
- **577m** · PID=30438 · 2026-06-18T22:07:30.698Z
- **592m** · PID=30438 · 2026-06-18T22:22:47.526Z
- **608m** · PID=30438 · 2026-06-18T22:38:05.293Z
- **623m** · PID=30438 · 2026-06-18T22:53:26.039Z
- **638m** · PID=30438 · 2026-06-18T23:08:43.774Z
- **654m** · PID=30438 · 2026-06-18T23:24:02.122Z
- **669m** · PID=30438 · 2026-06-18T23:39:20.652Z
- **684m** · PID=30438 · 2026-06-18T23:54:43.302Z
- **700m** · PID=30438 · 2026-06-19T00:10:04.447Z
- **715m** · PID=30438 · 2026-06-19T00:25:24.967Z
- **730m** · PID=30438 · 2026-06-19T00:40:46.374Z

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
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-501m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-516m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-531m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-547m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-562m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-577m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-592m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-608m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-623m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-638m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-654m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-669m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-684m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-700m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-715m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-730m-services.txt`

## checkpoint.json

- priceRefreshRuns: 44
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
