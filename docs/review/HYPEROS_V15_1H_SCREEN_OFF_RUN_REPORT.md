# HyperOS v15 — 1h Screen-Off Run Report

## Executive summary: **GO**

| Field | Value |
|-------|-------|
| Stage | 1h screen-off |
| Test window (MYT) | **2026-06-16 09:11:38 → 10:23:04** |
| Duration | ~71 min (1h monitor + phase12-5 tail) |
| APK | **preview-v15.apk** (versionCode **15**, EAS `e4491fe1`) |
| Device | **FYRWXSNNAIOR9DCM** (Redmi Note 13 Pro / HyperOS) |
| Branch | `cursor/top3-maxdd-capital-audit` |
| Run ID | `20260616-091138` |
| phase12-5 exit | **0** (PASS) |

---

## Verification matrix

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | PID maintenance | **PASS** | baseline **27511**, final **27511**, lost **0** |
| 2 | Heartbeat continuation | **PASS** | **67** lines (expected ≥10) |
| 3 | Twelve Data / price | **PASS** | **24** `price_update` lines; UI refresh **3/3** ok |
| 4 | News fetch | **PASS** | **30** `news_fetch` lines |
| 5 | Foreground Service | **PASS** | `LongRunForegroundService` in all dumpsys polls; `fgsOk: true` |
| 6 | WakeLock | **PASS** | `wakeLockHeld: true` all polls; `wlOk: true` |
| 7 | Crash / FATAL | **PASS** | **0** |
| 8 | ANR | **PASS** | **0** |

### Gate criteria (user)

| Criterion | Result |
|-----------|--------|
| PID lost events = 0 | **PASS** |
| fatal = 0 | **PASS** |
| anr = 0 | **PASS** |
| foregroundServiceRunning = true | **PASS** (dumpsys `isForeground=true` at 60m) |
| wakeLockHeld = true | **PASS** (all polls) |

**3h screen-off test:** authorized only after this **GO** (see § Next steps).

---

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
| 15m | 27511 | -2 | 1 | 2 | Y | Y | Awake |
| 30m | 27511 | 2 | 0 | -2 | Y | Y | Awake |
| 45m | 27511 | -3 | -1 | 1 | Y | Y | **Dozing** |
| 60m | 27511 | 0 | 0 | 1 | Y | Y | **Dozing** |

Poll HBΔ negatives are logcat window resets; final logcat total **67** heartbeats.

---

## PID timeline

| Elapsed | PID | Timestamp (UTC) |
|---------|-----|-----------------|
| 15m | 27511 | 2026-06-16T01:27:01.119Z |
| 30m | 27511 | 2026-06-16T01:42:05.459Z |
| 45m | 27511 | 2026-06-16T01:57:09.198Z |
| 60m | 27511 | 2026-06-16T02:12:11.268Z |
| final | 27511 | ended 2026-06-16T02:23:04.669Z |

---

## dumpsys activity services

- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-15m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-30m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-45m-services.txt`
- `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-60m-services.txt`

60m excerpt:

```
* ServiceRecord{... LongRunForegroundService ...}
  isForeground=true foregroundId=9001 types=0x00000001
  startForegroundCount=1
```

Power / wakelock dumpsys (same run prefix): `20260616-091138-{15,30,45,60}m-power.txt`

---

## dumpsys notification

FGS notification confirmed at Phase 1 (`id=9001`, channel `long_run_survival`, title `12時間監視`).  
During 1h polls, ongoing FGS notification persisted via dumpsys services `foregroundNoti=...`.

Phase 1 reference: `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-dumpsys-notification.txt`

---

## survival_status

| Metric | Count |
|--------|-------|
| `survival_enabled` | 2 |
| `survival_status` | 2 |
| `survival_events` (orchestrator) | 4 |
| Native `STA-SURVIVAL` in final snapshot | 0* |

\*Final logcat snapshot is a rolling buffer; FGS native start proven at Phase 1 and dumpsys throughout 1h run.

---

## Logcat summary

| Metric | Count |
|--------|-------|
| FATAL | 0 |
| ANR | 0 |
| `[12H-MONITOR] heartbeat` | **67** |
| `price_update` | **24** |
| `news_fetch` | **30** |

Files:

- `docs/review/hyperos-screen-off-survival/logcat-summary-3h-20260616-091138.txt`
- `docs/review/phase12-5-long-run/logcat-snapshot-20260616-102254.txt`
- `docs/review/twelve-hour-test/adb-logcat-final-20260616-102254.log`

---

## checkpoint.json (phase12-5)

| Field | Value |
|-------|-------|
| priceRefreshRuns | 3 (h0-m0, m15, m30 — all ok) |
| pidLostEvents | 0 |
| fatal | 0 |
| anrCount | 0 |
| endedAt | 2026-06-16T02:22:44.112Z |

---

## Related reports

| Report | Path |
|--------|------|
| Phase 1 v15 | `docs/review/FGS_PHASE1_V15_REPORT.md` |
| 1h interim | `docs/review/HYPEROS_V15_1H_SCREEN_OFF_RUN_INTERIM_REPORT.md` |
| Evidence JSON | `docs/review/hyperos-screen-off-survival/hyperos-v10-1h-evidence.json` |

---

## GitHub sync

| Commit | Message |
|--------|---------|
| `af92401` | v15 Phase 1 PASS |
| `3dbecc0` | v15 1h interim report |
| _(this report)_ | pending push |

Push: pending this commit.

---

## Next steps

1. **3h screen-off** — proceed only with user approval (`VERIFY_HYPEROS_STAGE=3h`, `preview-v15.apk` on device).
2. Staged chain: `npm run verify:hyperos-v10-staged` or `verify-hyperos-v9-3h-screen-off.mjs` with `PHASE12_5_HOURS=3`.
