# HyperOS 12h GO / NO-GO Report

## Verdict: **GO** — 12時間テスト開始可

**Date:** 16/06/2026, 20:58:42 MYT  
**Branch:** cursor/top3-maxdd-capital-audit  
**APK:** preview-v15.apk (versionCode 15)  
**Device:** FYRWXSNNAIOR9DCM (Redmi Note 13 Pro / HyperOS)

---

## Gate summary

| Gate | Status | Evidence |
|------|--------|----------|
| App PID / FGS / WakeLock (3h RERUN) | **PASS** | APP_GO — 12/12 polls, PID 2506 |
| run-scoped logcat capture | **PASS** | 30m RERUN 21810141 bytes |
| cold launch harness | **PASS** | logcat-capture-30m RERUN |
| monitorReady | **PASS** | `12H-MONITOR` seen within 120s |
| monitorPass | **PASS** | heartbeat=2, survival_health_ok=0 |
| Orchestrator finalize | **PASS** | 3h RERUN writeEvidence OK |

---

## 30m RERUN event counts

| Pattern | Count |
|---------|-------|
| 12H-MONITOR | **13** |
| heartbeat | **2** |
| price_update | **0** |
| news_fetch | **0** |
| survival_health_ok | **0** |

Run ID: `20260616-202833`  
Report: `docs/review/LOGCAT_CAPTURE_30M_RERUN_REPORT.md`

---

## Recommended 12h launch

```powershell
$env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
$env:PHASE12_5_HOURS="12"
$env:PHASE12_5_SKIP_APK_REINSTALL="1"
node scripts/verify-hyperos-v9-3h-screen-off.mjs
```

---

## GitHub sync

Commit: **8474fdf6094750b8d167ca42a2c1a88f28574239**
