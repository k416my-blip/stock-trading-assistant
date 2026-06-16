# Foreground Service 根本原因分析レポート

作成日: 2026-06-16  
対象: HyperOS v10 · 30m screen-off run (runId `20260616-062821`)  
判定: **FGS は APK に存在せず、一度も起動していない**

---

## 1. エグゼクティブサマリー

| 項目 | 結論 |
|------|------|
| **Primary root cause** | `sta-native-runtime` Android モジュールが **APK にコンパイルされていない** |
| **Build failure trigger (v10)** | `modules/sta-native-runtime/android/build.gradle` の **UTF-8 BOM** → Gradle `Unexpected character: '?'` |
| **Build failure trigger (v11+)** | **Legacy `ExpoModulesCorePlugin.gradle` build.gradle** — Expo SDK 54 は `expo-module-gradle-plugin` 必須。`compileSdk` 未設定のため Gradle autolinking が **サイレントスキップ**（EAS ログ "Using expo modules" に `sta-native-runtime` 不在） |
| **Manifest gap** | `LongRunForegroundService` が **merged APK manifest に未登録** |
| **Runtime symptom** | `getSurvivalStatus()` → `{ wakeLockHeld: false, foregroundServiceRunning: false }` |
| **検出 vs 実態** | dumpsys FAIL は正しい · orchestrator 以前の v9/v10 PASS 系 WakeLock は **heuristic 誤検知** |

---

## 2. Phase 1 証跡 — v10 APK (preview-v10.apk)

### 2.1 aapt manifest（サービス登録）

`aapt dump xmltree artifacts/preview-v10.apk AndroidManifest.xml` より:

| 登録 service | 存在 |
|--------------|------|
| `expo.modules.notifications.service.*` | ✅ |
| `com.google.firebase.messaging.FirebaseMessagingService` | ✅ |
| **`expo.modules.stanativeruntime.LongRunForegroundService`** | **❌ 不在** |

権限は宣言済み:
- `FOREGROUND_SERVICE` ✅
- `FOREGROUND_SERVICE_DATA_SYNC` ✅
- `POST_NOTIFICATIONS` ✅ (runtime grant 別途)

### 2.2 dex / クラス

APK 内 `classes*.dex` に `stanativeruntime` / `LongRunForegroundService` **文字列なし** → **ネイティブモジュール未同梱**。

### 2.3 端末 pm dump（versionCode 10 インストール後）

```
pm dump / dumpsys package com.assistant.stocktrading
→ LongRunForegroundService / stanativeruntime: 0 hits
```

---

## 3. Phase 1 証跡 — 30m ラン runtime

### 3.1 getSurvivalStatus() 相当（logcat）

```
06-16 06:58:02 W/ReactNativeJS: '[12H-MONITOR]', 'survival_health_degraded',
  { wakeLockHeld: false, foregroundServiceRunning: false }
06-16 06:58:02 I/ReactNativeJS: '[12H-MONITOR]', 'survival_repaired', ...
06-16 06:58:02 I/ReactNativeJS: '[12H-MONITOR]', 'survival_status',
  { wakeLockHeld: false, foregroundServiceRunning: false }
```

### 3.2 STA-SURVIVAL native logcat

**0 行** — `LongRunForegroundService.onCreate` / `startForeground OK` **未実行**。

### 3.3 startForeground() 実行ログ

**なし** — AMS に `Background started FGS` for `com.assistant.stocktrading` **なし**。

### 3.4 dumpsys activity services（30m · 30分 poll）

```
ACTIVITY MANAGER SERVICES (dumpsys activity services com.assistant.stocktrading)
  (nothing)
```

保存: `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-062821-30m-services.txt`

### 3.5 dumpsys notification

アプリ通知チャンネルは存在するが **`long_run_survival` チャンネル未作成**（FGS 未起動のため）。

---

## 4. Android 14 / HyperOS — FOREGROUND_SERVICE_TYPE_DATA_SYNC

| 確認項目 | v10 APK | 備考 |
|----------|---------|------|
| Manifest `foregroundServiceType="dataSync"` | **❌ service 自体なし** | 適用不可 |
| Kotlin `ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC` | ソースに **実装済み** | APK 未同梱のため未実行 |
| targetSdk | **36** | Android 14+ 厳格 FGS 要件あり |
| device SDK | **36** | HyperOS · Redmi Note 13 Pro |

**結論:** service type 実装はソース正しいが、**ビルド产物に載っていない**ため HyperOS 上では一度も適用されていない。

---

## 5. 未起動原因チェックリスト

| 項目 | 結果 |
|------|------|
| startForeground() 例外 | **N/A** — service クラス未ロード |
| Notification 権限 | declared ✅ · runtime 未確認 · **FGS 未到達** |
| service type mismatch | ソース OK · **manifest service 欠落** |
| Manifest 設定 | library manifest あり · **merge 結果 APK に不在** |
| stopWithTask | ソース `false` · **未デプロイ** |
| START_STICKY | ソース `START_STICKY` · **未デプロイ** |
| Gradle BOM | **FAIL** `build.gradle` line 1 `Unexpected character: '?'` |
| Expo autolinking resolve | **PASS** (local resolve JSON に module 列出) |
| Expo prebuild / EAS compile | **FAIL** (BOM → module skip) |

---

## 6. Gradle 再現ログ（ローカル）

```
build file '.../modules/sta-native-runtime/android/build.gradle': 1: Unexpected character: '?' @ line 1, column 1.
```

BOM 除去後は当該 parse error は解消（以降は expo prebuild 環境依存の別エラー）。

---

## 7. 修正方針（v11）

| # | 対策 | ファイル |
|---|------|----------|
| 1 | UTF-8 BOM 除去（全 android ソース） | `modules/sta-native-runtime/android/**` |
| 2 | Expo config plugin で service を **main manifest に明示 merge** | `plugins/withLongRunForegroundService.js` |
| 3 | versionCode **11** | `app.json` |
| 4 | EAS preview 再ビルド & インストール | `artifacts/preview-v11.apk` |
| 5 | ビルド後 `aapt` + `collect-fgs-evidence.mjs` で FGS 実稼働証明 | 必須ゲート |
| 6 | ゲート PASS 後 **1h screen-off** 再検証 | `HYPEROS_V10_1H_SCREEN_OFF_RUN_REPORT.md` |

---

## 8. 提出物索引

| 種別 | パス |
|------|------|
| 30m レポート | `docs/review/HYPEROS_V10_30M_SCREEN_OFF_RUN_REPORT.md` |
| dumpsys (30m) | `docs/review/hyperos-screen-off-survival/dumpsys-evidence/` |
| logcat snapshot | `docs/review/phase12-5-long-run/logcat-snapshot-20260616-065911.txt` |
| 30m evidence JSON | `docs/review/hyperos-screen-off-survival/hyperos-v10-30m-evidence.json` |
| Power audit | `docs/review/hyperos-screen-off-survival/hyperos-power-audit-20260616-062820.md` |
| 本レポート | `docs/review/FGS_ROOT_CAUSE_REPORT.md` |

---

## 9. GitHub

| 項目 | 値 |
|------|-----|
| 修正コミット | _(v11 fix commit — push 後に追記)_ |
| ブランチ | `cursor/top3-maxdd-capital-audit` |

---

## 10. v11 verification (EAS build `1a349304-45e0-4bd4-9d37-94f6a06c893b`, commit `cbe5077`)

**Phase 1 gate: FAIL** — do not run 1h screen-off until native module is in dex and FGS runs.

| Check | v11 result |
|-------|------------|
| EAS preview build | finished, versionCode **11**, commit **cbe507759c397e26dc5fb6b5cf6b2f4e7da1496c** |
| APK local path | `artifacts/preview-v11.apk` (80,763,938 bytes) |
| aapt: `LongRunForegroundService` in manifest | **PASS** |
| aapt: `FOREGROUND_SERVICE_DATA_SYNC` permission | **PASS** |
| aapt: `foregroundServiceType` on service | **PASS** (`0x1` = dataSync) |
| dex: `stanativeruntime` / `LongRunForegroundService` / `StaNativeRuntime` | **FAIL** (classes.dex, classes2.dex, classes3.dex — dexdump 0 hits) |
| Kotlin source `FOREGROUND_SERVICE_TYPE_DATA_SYNC` | **PASS** (source only; not in APK dex) |
| logcat `STA-SURVIVAL` / `startForeground OK` | **FAIL** (0 lines) |
| logcat `[12H-MONITOR] survival_enabled` | present; `wakeLockHeld: false`, `foregroundServiceRunning: false` |
| dumpsys `activity services com.assistant.stocktrading` | **FAIL** (`(nothing)`) |
| Device serial | `FYRWXSNNAIOR9DCM` connected |

### Evidence paths (v11 Phase 1)

| Artifact | Path |
|----------|------|
| Manifest aapt (manual run) | `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-074829-apk-manifest-aapt.txt` |
| Logcat + dumpsys (15s wait) | `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-074829-*` |
| Logcat + dumpsys (90s wait, cleared logcat) | `docs/review/hyperos-screen-off-survival/fgs-evidence/20260616-075100-extended-*` |
| dexdump (no native hits) | `artifacts/_v11_classes.dexdump.txt`, `artifacts/_v11_classes2.dex.dump.txt`, `artifacts/_v11_classes3.dex.dump.txt` |
| EAS build page | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/1a349304-45e0-4bd4-9d37-94f6a06c893b |

### v11 diagnosis (partial fix)

- Config plugin **merged manifest service** (fixes v10 “service missing in manifest”).
- **`sta-native-runtime` still not compiled into APK dex** — JS `NativeModules.StaNativeRuntime` absent; `enableLongRunSurvival` no-ops via optional chaining; status stays false.
- Next: EAS/Gradle build logs for `:sta-native-runtime` / autolinking; ensure module compiles on cloud (not manifest-only).

### GitHub (this verification pass)

| Item | Value |
|------|-------|
| Branch | `cursor/top3-maxdd-capital-audit` |
| Fix commit (pushed before build) | `cbe5077` |
| Report commit | _(see git log after doc commit)_ |
| Push | pending report commit |

---

## 11. v12 fix — migrate build.gradle to expo-module-gradle-plugin

### Root cause (confirmed)

| Investigation | Result |
|---------------|--------|
| `npx expo-modules-autolinking resolve --platform android` | **PASS** — `sta-native-runtime` listed |
| EAS v11 Gradle log "Using expo modules" | **FAIL** — `sta-native-runtime` **absent** (only expo-constants, expo-modules-core, published 📦 modules) |
| Local `:sta-native-runtime:assembleRelease` (pre-fix) | **FAIL** — `does not specify compileSdk`; legacy `ExpoModulesCorePlugin.gradle` pattern |
| `.easignore` / `.gitignore` | **PASS** — `modules/sta-native-runtime` not excluded |
| `package.json` `file:./modules/sta-native-runtime` | **PASS** |

**Conclusion:** Autolinking *resolved* the module in JS, but Gradle *excluded* it because `android/build.gradle` used the pre-SDK-54 `apply from: ExpoModulesCorePlugin.gradle` pattern instead of `id 'expo-module-gradle-plugin'`. EAS build succeeded without the module (silent skip); manifest plugin still merged `LongRunForegroundService` (manifest-only, no dex classes).

### Fix applied

| # | Change | File |
|---|--------|------|
| 1 | Replace legacy plugin with `expo-module-gradle-plugin` (sets compileSdk/targetSdk via version catalog) | `modules/sta-native-runtime/android/build.gradle` |
| 2 | versionCode **12** | `app.json` |
| 3 | Cross-platform sleep (`timers/promises`) instead of `timeout /t` | `scripts/collect-fgs-evidence.mjs` |

### Local verification (pre-EAS)

```
./gradlew :sta-native-runtime:assembleRelease
→ BUILD SUCCESSFUL
→ "Using expo modules" includes sta-native-runtime (1.0.0)
```

### v12 EAS verification

**Phase 1 gate: FAIL** — build.gradle migration alone insufficient on EAS; Gradle log still omits `sta-native-runtime`.

| Check | v12 result |
|-------|------------|
| EAS preview build | `e5cfdf38-451c-4574-b7bc-52f9cad20ea9`, versionCode **12**, commit **9b8455b** |
| EAS Gradle "Using expo modules" | **FAIL** — `sta-native-runtime` still absent |
| dex: `stanativeruntime` / `LongRunForegroundService` / `StaNativeRuntime` | **FAIL** (0 hits all dex) |
| Local `:sta-native-runtime:assembleRelease` (same commit) | **PASS** |

**v12 follow-up root cause:** EAS autolinking never scans `./modules` unless `expo.autolinking.nativeModulesDir` is set. JS resolve finds the package via `file:` dependency, but Gradle `useExpoModules()` on cloud only listed published 📦 modules.

### v13 fix (additional)

| # | Change | File |
|---|--------|------|
| 1 | `expo.autolinking.nativeModulesDir: "./modules"` | `package.json` |
| 2 | `install-links=false` (copy file: deps on EAS npm ci) | `.npmrc` |
| 3 | Exclude module Gradle build cache from upload | `.easignore` |
| 4 | versionCode **13** | `app.json` |

### v13 EAS verification

_(filled after build completes)_

