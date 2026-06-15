# FGS Phase 1 — evidence collection interim

Updated: 2026-06-16 (v11 on device)

## Status: **Phase 1 FAIL (gate closed)**

1h screen-off test **not started** (gate requires FGS PASS).

## Completed

- [x] Device `FYRWXSNNAIOR9DCM` connected (`adb devices`)
- [x] EAS preview v11 build `1a349304-45e0-4bd4-9d37-94f6a06c893b` (commit `cbe5077`)
- [x] Download `artifacts/preview-v11.apk`, install on device
- [x] aapt manifest: `LongRunForegroundService` + `foregroundServiceType` dataSync
- [x] Manual FGS evidence (logcat -c, cold launch, 90s wait)
- [x] dexdump: no `stanativeruntime` in any dex
- [x] `FGS_ROOT_CAUSE_REPORT.md` section 10 updated

## Blocked

- [ ] `collect-fgs-evidence.mjs` end-to-end (fails: `timeout /t 12` exit 1 under node execSync — use `Start-Sleep` fix)
- [ ] Phase 1 gate PASS
- [ ] 1h screen-off (`verify-hyperos-v9-3h-screen-off.mjs`)

## Phase 1 gate checklist

| Criterion | Result |
|-----------|--------|
| STA-SURVIVAL / startForeground OK in logcat | **FAIL** |
| dumpsys services not empty | **FAIL** (`nothing`) |
| `foregroundServiceRunning: true` in survival_status | **FAIL** (false at `survival_enabled`) |

## Key evidence

- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-075100-extended-logcat.txt`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-075100-extended-dumpsys-services.txt`
- `docs/review/FGS_ROOT_CAUSE_REPORT.md` §10

## Conclusion

v11 adds manifest service via plugin but **native module still missing from APK**. Same runtime symptom as v10: monitor enables survival stack in JS, native status remains false.
