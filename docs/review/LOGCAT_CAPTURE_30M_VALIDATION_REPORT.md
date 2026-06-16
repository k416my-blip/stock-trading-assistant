# Logcat Capture 30m Validation Report

## Verdict: **PASS**

| Field | Value |
|-------|-------|
| Run ID | `20260616-193413` |
| Window (MYT) | 16/06/2026, 19:34:13 MYT → 16/06/2026, 20:04:15 MYT |
| Duration | 30 min |
| Device | FYRWXSNNAIOR9DCM |
| Capture file | `docs/review/hyperos-screen-off-survival/logcat-live-verify-20260616-193413.log` |
| Method | Node `spawn('adb logcat')` → `WriteStream` (replaces PowerShell Out-File) |

## Results

| Metric | Value | Gate |
|--------|-------|------|
| Final file size | **17142718** bytes | > 0 |
| heartbeat lines | **0** | accumulated in live file |
| price_update lines | **0** | accumulated in live file |
| news_fetch lines | **0** | accumulated in live file |
| Capture PID | 44616 | adb child |

## 5-minute samples

| Elapsed | Bytes | HB | price | news |
|---------|-------|-----|-------|------|
| 0m | 0 | 0 | 0 | 0 |
| 5m | 3223132 | 0 | 0 | 0 |
| 10m | 4670678 | 0 | 0 | 0 |
| 15m | 9463853 | 0 | 0 | 0 |
| 20m | 13143246 | 0 | 0 | 0 |
| 25m | 15263701 | 0 | 0 | 0 |

## Root cause (fixed)

PowerShell `adb | ForEach-Object { Out-File -Append }` spawned detached from Node produced **0-byte** files on Windows. Node direct pipe is the fix.

## Evidence

- `docs/review/hyperos-screen-off-survival/logcat-capture-30m-20260616-193413.json`

## GitHub sync

Commit: **cc0320bfd479f763a55ba41add40454a949bd413**
