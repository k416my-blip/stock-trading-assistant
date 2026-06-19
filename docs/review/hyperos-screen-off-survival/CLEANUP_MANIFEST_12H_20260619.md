# 12h Test Temporary File Cleanup Manifest

**Date:** 2026-06-19  
**Action:** Post-GO cleanup after run `20260618-202947`  
**Space freed:** ~2,344.6 MB (29 files)

---

## Removed (temporary / superseded)

| Category | Files | Reason |
|----------|-------|--------|
| Production logcat raw | `logcat-live-20260618-202947.log` (1,054.8 MB) | Metrics extracted to summary + evidence JSON |
| Failed 12h attempt raw | `logcat-live-20260616-210645.log` (547.9 MB) | Summary retained |
| 6h validation raw | `logcat-live-20260617-192027.log` (675.4 MB) | Summary retained |
| 30m verify raw | `logcat-live-verify-20260616-*.log` (4 files) | Captured in validation reports |
| Empty/stale logcat | `logcat-live-20260616-142148.log`, `143009.log` | 0 bytes |
| 30m capture metadata | `logcat-capture-30m-20260616-*.json` (4 files) | Redundant with reports |
| Debug snapshot | `_tmp-logcat-snapshot.txt` | Temporary |
| Error logs | `hyperos-v15-3h-*.log.err` (3 files) | Superseded by RERUN |
| Early v9 polls | `poll/result/baseline/logcat-tail-20260615-*` (12 files) | Pre-V15 harness |

---

## Retained (audit trail)

| Artifact | Path |
|----------|------|
| 12h evidence | `hyperos-v15-12h-evidence.json` |
| 12h logcat summary | `logcat-summary-12h-20260618-202947.txt` |
| 6h evidence + summary | `hyperos-v15-6h-evidence.json`, `logcat-summary-6h-20260617-192027.txt` |
| 3h RERUN evidence | `hyperos-v15-3h-rerun-evidence.json` |
| Power audits | `hyperos-power-audit-*.json/md` |
| dumpsys snapshots | `dumpsys-evidence/20260618-202947-*` |
| All markdown reports | `docs/review/HYPEROS_V15_12H_*`, `FINAL_12H_*`, etc. |

---

## Policy going forward

Add to `.gitignore`:

```
docs/review/hyperos-screen-off-survival/logcat-live*.log
```

Delete raw logcat after successful finalize + summary write. Never commit multi-GB log files.

---

## Note on evidence JSON paths

`hyperos-v15-12h-evidence.json` still references `runLiveLogPath: logcat-live-20260618-202947.log`. The file was removed locally after streamed metrics extraction; summary file is the canonical post-cleanup reference.
