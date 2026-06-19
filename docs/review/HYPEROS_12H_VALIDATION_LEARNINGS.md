# HyperOS 12h Validation — Operational Learnings

**Updated:** 2026-06-19  
**Canonical result:** GO — run `20260618-202947`

This document consolidates tooling and harness learnings from the HyperOS 12h validation chain. Supersedes open items in `TWELVE_HOUR_TEST_START_READINESS_REPORT.md`.

---

## 1. Logcat capture (Windows)

**Problem:** Run-scoped logcat files were 0 bytes when using PowerShell detached `Out-File` with `adb logcat`.

**Solution:** `scripts/lib/hyperos-logcat-capture.mjs` — Node `spawn('adb logcat')` with stdout piped to file.

**Verify:** 30m RERUN `20260616-202833` produced 21,810,141 bytes.

---

## 2. Monitor event measurement

**Problem:** heartbeat=0, price_update=0 in 30m verify despite app working.

**Root cause:** Harness ran logcat capture only — no cold app launch, no monitor bootstrap.

**Solution:** Verify scripts must cold-launch app and wait for `12H-MONITOR` within 120s before counting events.

**Reference:** `docs/review/MONITOR_EVENT_ROOT_CAUSE_REPORT.md`

---

## 3. Streamed logcat metrics (long runs)

**Problem:** `ERR_STRING_TOO_LONG` at ~5h when finalize called `readFileSync` on 574MB+ logcat.

**Solution:** `readLogcatMetricsFromFile()` in `scripts/lib/hyperos-monitor-metrics.mjs` — chunked stream reader.

**Validated:** 6h run `20260617-192027` PASS; 12h run `20260618-202947` PASS at 1.1GB.

**Commits:** 780118f, 5b054dc

---

## 4. Git sync watcher

**Problem:** Interim git sync exited early when stale `HYPEROS_V15_12H_RUN_REPORT.md` from prior run existed.

**Solution:** `scripts/hyperos-12h-interim-git-sync.mjs` — finalize check keyed on `runId` in evidence JSON.

**Commit:** 95d68f2

---

## 5. APK requirements for validation

- `artifacts/preview-v15.apk` (versionCode 15)
- `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` baked at build time
- Device whitelist + battery unrestricted recommended (HyperOS)

---

## 6. Launch command (12h production)

```powershell
$env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
$env:PHASE12_5_HOURS="12"
$env:PHASE12_5_SKIP_APK_REINSTALL="1"
node scripts/verify-hyperos-v9-3h-screen-off.mjs
```

Optional interim sync (separate terminal):

```powershell
node scripts/hyperos-12h-interim-git-sync.mjs
```

---

## 7. Evidence retention policy

**Keep in repo:**

- `hyperos-v15-12h-evidence.json`
- `logcat-summary-12h-{runId}.txt`
- Markdown reports and dumpsys snapshots
- Hourly interim reports

**Delete after summary extraction:**

- `logcat-live-*.log` (multi-GB; not git-friendly)
- `logcat-live-verify-*.log` (30m harness only)
- Intermediate `logcat-capture-30m-*.json`

See `docs/review/hyperos-screen-off-survival/CLEANUP_MANIFEST_12H_20260619.md`.

---

## 8. Known cosmetic issue

Shell may exit with code 1 when `phase12_5ExitCode=null` despite all gates PASS. Does not affect app or evidence verdict. Track under Phase 25 P0-3.

---

## Related reports

- `FINAL_12H_VALIDATION_REPORT.md`
- `HYPEROS_V15_12H_RUN_REPORT.md`
- `ORCHESTRATOR_FINAL_VALIDATION_REPORT.md`
- `HYPEROS_12H_GO_NO_GO_REPORT.md`
