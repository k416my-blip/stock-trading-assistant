# FGS Phase 1 — v15 Report (HyperOS)

Updated: 2026-06-16  
Branch: `cursor/top3-maxdd-capital-audit`  
Verdict: **Phase 1 PASS** → 1h screen-off test authorized

---

## 1. v15 build

| Item | Value |
|------|-------|
| EAS build ID | `e4491fe1-7b66-4dbc-9085-2e5e97c2bf53` |
| versionCode | **15** |
| Git commit (build) | `c3916f8` + bridge fix `1bd12b1` |
| APK | `artifacts/preview-v15.apk` |
| Fix | `requireNativeModule('StaNativeRuntime')` in `longRunSurvival.ts` + `nativeRuntimeBridge.ts` |

Build logs: https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/e4491fe1-7b66-4dbc-9085-2e5e97c2bf53

---

## 2. Code verification

### `longRunSurvival.ts`

```typescript
function getNativeSta(): NativeSurvivalModule | undefined {
  try {
    return requireNativeModule<NativeSurvivalModule>('StaNativeRuntime');
  } catch {
    return NativeModules.StaNativeRuntime as NativeSurvivalModule | undefined;
  }
}
```

### `nativeRuntimeBridge.ts`

Same `requireNativeModule('StaNativeRuntime')` pattern with `NativeModules` fallback.

---

## 3. Phase 1 gate — collect run `20260616-090917`

Device: `FYRWXSNNAIOR9DCM`  
Script: `node scripts/collect-fgs-evidence.mjs` (logcat cleared, 30s wait after cold launch)

| Criterion | Result | Evidence |
|-----------|--------|----------|
| STA-SURVIVAL logcat | **PASS** | `wakeLock acquired`, `onCreate`, `startForegroundService requested`, `startForeground OK notificationId=9001` |
| startForeground OK | **PASS** | `09:09:31.563 I/STA-SURVIVAL: startForeground OK notificationId=9001` |
| dumpsys LongRunForegroundService | **PASS** | `isForeground=true`, `startForegroundCount=1`, `types=0x00000001` (dataSync) |
| wakeLockHeld = true | **PASS** | `survival_status { wakeLockHeld: true, ... }` |
| foregroundServiceRunning = true | **PASS*** | dumpsys `isForeground=true`; initial `getSurvivalStatus()` at t+5ms returned false (race before `startForeground OK` at t+27ms) |

\*Functional FGS confirmed by dumpsys + AMS `Background started FGS: Allowed [callingPackage: com.assistant.stocktrading ... LongRunForegroundService]`.

---

## 4. Evidence excerpts

### logcat (`20260616-090917-logcat.txt`)

```
I/STA-SURVIVAL: wakeLock acquired tag=sta-long-run held=true
I/STA-SURVIVAL: startForegroundService requested title=12時間監視
I/STA-SURVIVAL: onCreate
I/STA-SURVIVAL: startForeground OK notificationId=9001
I/ReactNativeJS: survival_status { wakeLockHeld: true, foregroundServiceRunning: false }  // t+5ms race
I/ActivityManager: Background started FGS: Allowed [callingPackage: com.assistant.stocktrading ... LongRunForegroundService]
```

### dumpsys activity services (`20260616-090917-dumpsys-services.txt`)

```
* ServiceRecord{... com.assistant.stocktrading/expo.modules.stanativeruntime.LongRunForegroundService ...}
  isForeground=true foregroundId=9001 types=0x00000001
  startForegroundCount=1
```

### dumpsys notification (`20260616-090917-dumpsys-notification.txt`)

```
NotificationRecord(... pkg=com.assistant.stocktrading id=9001 ... flags=ONGOING_EVENT|FOREGROUND_SERVICE ...)
  android.title=12時間監視
  channel=long_run_survival
```

### getSurvivalStatus()

Via `[12H-MONITOR] survival_status` logcat line + dumpsys cross-check at collection time (~30s post-launch).

---

## 5. Evidence paths

| File | Purpose |
|------|---------|
| `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-logcat.txt` | STA-SURVIVAL + survival_status |
| `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-dumpsys-services.txt` | LongRunForegroundService record |
| `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-dumpsys-notification.txt` | FGS notification id=9001 |
| `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-dumpsys-package.txt` | versionCode=15 |
| `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-090917-summary.json` | Run metadata |

First collect run `20260616-090653` **invalid** (evidence gathered during APK install overlay). Discarded for gate decision.

---

## 6. Follow-up fix (post-v15, not in v15 APK)

- Lazy `getNativeSta()` per call (not module load)
- 400ms settle delay before `getSurvivalStatus()` after `startLongRunForegroundService`
- `collect-fgs-evidence.mjs`: `logcat -c` + 30s wait

Committed for next build; **not required** for Phase 1 PASS (runtime FGS proven on v15).

---

## 7. GitHub sync

| Commit | Message |
|--------|---------|
| `1bd12b1` | requireNativeModule bridge fix |
| `c3916f8` | v14 dex PASS docs + v15 APK path |
| _(this report)_ | pending push |

Push: pending this commit.

---

## 8. Next step

**1h screen-off test** → `HYPEROS_V10_1H_SCREEN_OFF_RUN_REPORT.md` (authorized).
