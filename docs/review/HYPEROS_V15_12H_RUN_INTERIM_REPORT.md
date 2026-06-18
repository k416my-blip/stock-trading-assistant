# HyperOS V15 12h Screen-Off Run — Interim Report — 4h

Updated: **2026-06-19 00:32:13 MYT**  
Purpose: **12h production validation (APP_GO + ORCHESTRATOR_GO chain)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260618-202947`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | in-memory or pending |
| run-scoped logcat bytes | 381760159 |
| polls completed | 16 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-18 20:29:47 MYT |
| Elapsed | ~242 min |
| Completion | ~34% |
| Expected end (MYT) | 2026-06-19 08:30:03 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 30438 (baseline 30438) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 56 |
| 4 | Price (latest poll total) | 30 |
| 5 | News (latest poll total) | 40 |
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

## checkpoint.json

- priceRefreshRuns: 15
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
