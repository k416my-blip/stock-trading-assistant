# Orchestrator Streaming Validation Report

## Verdict: **PASS**

**Purpose:** Validate streamed logcat metrics fix after `ERR_STRING_TOO_LONG` at ~5h (run `20260616-210645`).  
**Run ID:** `20260617-192027`  
**Window (MYT):** 2026-06-17 19:20:27 MYT → 2026-06-18 01:32:27 MYT  
**Duration:** 6h orchestrator validation  
**APK:** preview-v15.apk (versionCode 15)  
**Device:** FYRWXSNNAIOR9DCM

## Validation matrix

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | writeEvidence errors | PASS | none |
| 2 | auto-finalize executed | PASS | finalizeRan=true |
| 3 | run-scoped logcat | PASS | **708222242** bytes |
| 4 | streamed metrics (no OOM read) | PASS | streamed=true |
| 5 | heartbeat aggregation | PASS | **89** |
| 6 | price_update aggregation | PASS | **50** |
| 7 | evidence.json | PASS | `docs/review/hyperos-screen-off-survival/hyperos-v15-6h-evidence.json` |
| 8 | full poll schedule | PASS | polls=24 / 24 |

## Prior failure reference

| Run | Failure |
|-----|---------|
| 20260616-210645 | `readFileSync` on 574MB log → `ERR_STRING_TOO_LONG` @ ~5h |

## Fix reference

Commit: **780118f** — `readLogcatMetricsFromFile()` streamed chunk reader

## App reference (informational)

| Item | Value |
|------|-------|
| App eval | GO |
| PID lost | 0 |
| FATAL / ANR | 0 / 0 |

## Event counts (final)

| Pattern | Count |
|---------|-------|
| heartbeat | **89** |
| price_update | **50** |
| news_fetch | **66** |

## PID timeline

- **15m** · PID=13512
- **30m** · PID=13512
- **45m** · PID=13512
- **60m** · PID=13512
- **76m** · PID=13512
- **91m** · PID=13512
- **106m** · PID=13512
- **121m** · PID=13512
- **136m** · PID=13512
- **151m** · PID=13512
- **166m** · PID=13512
- **181m** · PID=13512
- **197m** · PID=13512
- **212m** · PID=13512
- **227m** · PID=13512
- **242m** · PID=13512
- **257m** · PID=13512
- **273m** · PID=13512
- **288m** · PID=13512
- **303m** · PID=13512
- **318m** · PID=13512
- **333m** · PID=13512
- **349m** · PID=13512
- **364m** · PID=13512

## GitHub sync

_(filled after commit/push)_
