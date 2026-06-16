# FGS Root Cause Report — v14 (HyperOS Phase 1)

Updated: 2026-06-16  
Branch: `cursor/top3-maxdd-capital-audit`  
Build commit (EAS): `941a73022a6baa6fdf01b9e3254ea3b58c8687f3`  
Report commit: _(see git log after this file is committed)_

## Verdict: **Phase 1 NO-GO** (1/3 gate criteria)

1時間画面 OFF テストは **開始していません**（3条件未達のため）。

| # | Gate criterion | Result |
|---|----------------|--------|
| 1 | Native classes in dex (`StaNativeRuntimeModule`, `LongRunForegroundService`) | **PASS** |
| 2 | `LongRunForegroundService` actually running (dumpsys) | **FAIL** |
| 3 | `startForeground()` success evidence (`STA-SURVIVAL` logcat) | **FAIL** |

---

## 1. EAS preview v14 build

| Item | Value |
|------|-------|
| EAS build ID | `53e919cf-87d5-44df-9b49-8c2d68918035` |
| Status | **finished** |
| versionCode | **14** |
| Git commit | `941a730` — restore postinstall sync + trim EAS archive |
| APK | `artifacts/preview-v14.apk` (80,780,322 bytes) |
| Prior failed build | `87c429e4` — Install dependencies (postinstall removed in `9c61806`; fixed in `941a730`) |
| Archive size | 19.6 MB (was 1.1 GB before `.easignore` trimmed `docs/review/`, `artifacts/`) |

Build logs: https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/53e919cf-87d5-44df-9b49-8c2d68918035

---

## 2. dexdump evidence — **PASS**

Run: `node scripts/verify-v14-dex-evidence.mjs`  
Run ID: `20260616-085237`

| Dex | StaNativeRuntimeModule | StaNativeRuntime | LongRunForegroundService | stanativeruntime |
|-----|------------------------|------------------|--------------------------|------------------|
| classes.dex | 0 | 0 | 0 | 0 |
| **classes2.dex** | **222** | **484** | **35** | **484** |
| classes3.dex | 0 | 0 | 0 | 0 |

Evidence files:

- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085237-dexdump-summary.json`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085237-dexdump-classes2.dex.txt`

**Root cause fixed (build):** EAS did not compile `sta-native-runtime` until:

1. `expo-module-gradle-plugin` migration (`9b8455b`)
2. `expo.autolinking.nativeModulesDir: "./modules"` (`7f261f8`)
3. `postinstall` copy to `node_modules/sta-native-runtime` (`3394d47` / restored `941a730`)
4. `.easignore` root-anchored `/android/` + trimmed heavy dirs (`9c61806`, `941a730`)

---

## 3. Phase 1 runtime evidence — **FAIL**

Device: `FYRWXSNNAIOR9DCM`  
Collect run: `20260616-085324` (`node scripts/collect-fgs-evidence.mjs`)

### getSurvivalStatus() (via `[12H-MONITOR]` logcat)

```
survival_enabled { screenAwake: false, wakeLockHeld: false, foregroundServiceRunning: false }
survival_status  { wakeLockHeld: false, foregroundServiceRunning: false }
```

### dumpsys activity services

```
ACTIVITY MANAGER SERVICES (dumpsys activity services)
  (nothing)
```

### dumpsys notification

No active FGS notification channel entry for `com.assistant.stocktrading` LongRun service.  
(App notification settings present; no foreground service notification posted.)

### STA-SURVIVAL / startForeground

**0 lines** in logcat — native Kotlin `Log.i(TAG, ...)` never emitted → native methods not invoked.

Evidence files:

- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085324-logcat.txt`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085324-dumpsys-services.txt`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085324-dumpsys-notification.txt`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085324-dumpsys-package.txt`
- `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-085324-apk-manifest-aapt.txt`

---

## 4. Runtime root cause (v14)

| Layer | Finding |
|-------|---------|
| Dex | Native module **present** in v14 APK |
| JS bridge | `longRunSurvival.ts` used `NativeModules.StaNativeRuntime` |
| New Architecture | `app.json` → `"newArchEnabled": true` |
| Effect | Expo Kotlin module **not exposed** on legacy `NativeModules`; optional-chains no-op; `getSurvivalStatus()` returns stub `{false,false}` without calling native code |

**Fix prepared (v15):** use `requireNativeModule('StaNativeRuntime')` from `expo-modules-core` in `longRunSurvival.ts` and `nativeRuntimeBridge.ts`.

---

## 5. FOREGROUND_SERVICE_TYPE_DATA_SYNC (Android 14 / HyperOS)

| Check | v14 |
|-------|-----|
| Manifest `foregroundServiceType` dataSync | **PASS** (aapt + config plugin) |
| Kotlin `FOREGROUND_SERVICE_TYPE_DATA_SYNC` | **PASS** (in dex source) |
| Runtime service type in dumpsys | **N/A** — service never started |

---

## 6. GitHub sync

| Commit | Message |
|--------|---------|
| `941a730` | fix(v14): restore postinstall sync and trim EAS archive for sta-native-runtime |
| _(pending)_ | docs + bridge fix commit |

Push: pending report commit.

---

## 7. Next steps (not executed — gate closed)

1. EAS preview **v15** with `requireNativeModule` bridge fix
2. Re-run Phase 1 (`collect:fgs-evidence`) — expect `STA-SURVIVAL startForeground OK`, dumpsys non-empty, `foregroundServiceRunning: true`
3. **Only then** → 1h screen-off → `HYPEROS_V10_1H_SCREEN_OFF_RUN_REPORT.md`
