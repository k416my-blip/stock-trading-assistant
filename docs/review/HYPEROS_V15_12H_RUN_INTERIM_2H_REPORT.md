# HyperOS V15 12h Screen-Off Run — Interim Report — 2h

Updated: **2026-06-18 22:30:57 MYT**  
Purpose: **12h production validation (APP_GO + ORCHESTRATOR_GO chain)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260618-202947`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | in-memory or pending |
| run-scoped logcat bytes | 214197708 |
| polls completed | 8 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-18 20:29:47 MYT |
| Elapsed | ~121 min |
| Completion | ~17% |
| Expected end (MYT) | 2026-06-19 08:30:03 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 30438 (baseline 30438) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 28 |
| 4 | Price (latest poll total) | 14 |
| 5 | News (latest poll total) | 19 |
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

## PID timeline

- **15m** · PID=30438 · 2026-06-18T12:45:14.176Z
- **30m** · PID=30438 · 2026-06-18T13:00:18.086Z
- **45m** · PID=30438 · 2026-06-18T13:15:22.373Z
- **60m** · PID=30438 · 2026-06-18T13:30:26.653Z
- **75m** · PID=30438 · 2026-06-18T13:45:36.967Z
- **91m** · PID=30438 · 2026-06-18T14:00:42.157Z
- **106m** · PID=30438 · 2026-06-18T14:15:47.643Z
- **121m** · PID=30438 · 2026-06-18T14:30:53.519Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-60m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-75m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-91m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-106m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-121m-services.txt`

## checkpoint.json

- priceRefreshRuns: 6
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
