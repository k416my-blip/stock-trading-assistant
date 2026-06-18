# HyperOS V15 12h Screen-Off Run — Interim Report — 1h

Updated: **2026-06-18 21:30:32 MYT**  
Purpose: **12h production validation (APP_GO + ORCHESTRATOR_GO chain)**  
APK: **preview-v15.apk** (versionCode **15**)  
Device: **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS)  
Run ID: `20260618-202947`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | PASS so far |
| streamed metrics path | in-memory or pending |
| run-scoped logcat bytes | 140567435 |
| polls completed | 4 |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | 2026-06-18 20:29:47 MYT |
| Elapsed | ~60 min |
| Completion | ~8% |
| Expected end (MYT) | 2026-06-19 08:30:03 MYT |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | 30438 (baseline 30438) |
| 2 | PID lost events | 0 |
| 3 | Heartbeat (latest poll total) | 13 |
| 4 | Price (latest poll total) | 6 |
| 5 | News (latest poll total) | 8 |
| 6 | FGS (latest poll) | true |
| 7 | WakeLock (latest poll) | true |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
| 15m | 30438 | 7 | 3 | 6 | Y | Y | Awake |
| 30m | 30438 | 10 | 5 | 7 | Y | Y | Awake |
| 45m | 30438 | 13 | 6 | 8 | Y | Y | Awake |
| 60m | 30438 | 13 | 6 | 8 | Y | Y | Dozing |

## PID timeline

- **15m** · PID=30438 · 2026-06-18T12:45:14.176Z
- **30m** · PID=30438 · 2026-06-18T13:00:18.086Z
- **45m** · PID=30438 · 2026-06-18T13:15:22.373Z
- **60m** · PID=30438 · 2026-06-18T13:30:26.653Z

## dumpsys evidence

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260618-202947-60m-services.txt`

## checkpoint.json

- priceRefreshRuns: 3
- pidLostEvents: 0
- fatal: 0
- anr: 0

## Provisional verdict

**TBD** — final at 12h completion.

Evidence: `docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json`
