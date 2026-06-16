# Logcat Capture 30m RERUN Report

## Verdict: **PASS**

| Field | Value |
|-------|-------|
| Run ID | `20260616-202833` |
| Window (MYT) | 16/06/2026, 20:28:33 MYT → 16/06/2026, 20:58:42 MYT |
| Duration | 30 min |
| Device | FYRWXSNNAIOR9DCM |
| APK | preview-v15.apk |
| Capture file | `docs/review/hyperos-screen-off-survival/logcat-live-verify-20260616-202833.log` |
| Method | Node adb pipe + cold launch harness |

## Harness gates

| Gate | Result | Requirement |
|------|--------|-------------|
| cold launch | **PASS** | force-stop + monkey launch |
| monitorReady | **PASS** | `12H-MONITOR` + `test_started` or `'heartbeat'` within 120s |
| run-scoped logcat | **PASS** | finalBytes > 0 |
| monitorPass | **PASS** | heartbeat ≥ 1 OR survival_health_ok ≥ 1 |

## Event counts (live file)

| Pattern | Count | orchestrator counter |
|---------|-------|---------------------|
| `12H-MONITOR` | **13** | substring |
| `heartbeat` (monitor) | **2** | countHeartbeat |
| `price_update` | **0** | countPriceUpdate |
| `news_fetch` | **0** | countNewsFetch |
| `survival_health_ok` | **0** | substring |

## 5-minute samples

| Elapsed | Bytes | HB | price | news |
|---------|-------|-----|-------|------|
| 0m | 312807 | 1 | 0 | 0 |
| 5m | 11564020 | 2 | 0 | 0 |
| 10m | 13984211 | 2 | 0 | 0 |
| 15m | 15659061 | 2 | 0 | 0 |
| 20m | 17638453 | 2 | 0 | 0 |
| 25m | 19784078 | 2 | 0 | 0 |

## Evidence

- `docs/review/hyperos-screen-off-survival/logcat-capture-30m-20260616-202833.json`
- `docs/review/hyperos-screen-off-survival/logcat-live-verify-20260616-202833.log`

## GitHub sync

Commit: **cc9212f**  
Push: **success** (`origin/cursor/top3-maxdd-capital-audit`)
