# Foreground Service 根本原因分析レポート

作成日: 2026-06-16  
対象: HyperOS v10 · 30m screen-off run (runId `20260616-062821`)  
判定: **FGS は APK に存在せず、一度も起動していない**

---

## 1. エグゼクティブサマリー

| 項目 | 結論 |
|------|------|
| **Primary root cause** | `sta-native-runtime` Android モジュールが **APK にコンパイルされていない** |
| **Build failure trigger** | `modules/sta-native-runtime/android/build.gradle` の **UTF-8 BOM** → Gradle `Unexpected character: '?'` |
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
