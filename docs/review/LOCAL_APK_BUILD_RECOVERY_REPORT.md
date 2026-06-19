# LOCAL_APK_BUILD_RECOVERY_REPORT

## 概要

EAS quota 回復前に、**Windows 環境で最新 commit（Phase24/23.1 UI 含む）の release APK** をローカル生成できるかを調査。

| 項目 | 値 |
|------|-----|
| 調査日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 調査時 HEAD | `6c2e5c1` |
| 目標 versionCode | **16**（`app.json` / `android/app/build.gradle` 同期済） |
| EAS preview | **BLOCKED**（Free plan · 2026-07-01 リセット） |

---

## エグゼクティブサマリー

| 質問 | 結論 |
|------|------|
| 1. `gradlew assembleRelease` 失敗の根本原因 | **現時点の第一原因: Metro release bundle が `fs` モジュール解決に失敗**（コード問題）。過去に報告された **MAX_PATH / ninja** および **`subst` + settings.gradle** も Windows 固有の第二・第三障壁。 |
| 2. Windows での修正方法 | **(A) `bursaRevenueRevisionSnapshotStore.ts` の Node `fs` 依存を RN バンドルから除外** → **(B) LongPathsEnabled 有効化** → **(C) 通常パスで Gradle 実行**（`subst` 非推奨） |
| 3. ローカル APK ビルド可否 | **現状 NO** — bundle 段階で停止。**コード修正後は YES（条件付き）** |
| 4. versionCode 16 APK 生成可能か | **設定上 YES**（versionCode 16 済）。**ビルド成功には上記 bundle 修正が必須**。EAS 不要のローカル経路は修正後に再試行可能。 |

---

## 1. 失敗原因（レイヤ別）

### 1.1 【第一原因 · 確認済】Metro release bundle — `fs` 解決不可

**再現コマンド（2026-06-19）:**

```powershell
cd android
.\gradlew.bat assembleRelease
```

**失敗タスク:** `:app:createBundleReleaseJsAndAssets`

**エラー（抜粋）:**

```
Error: Unable to resolve module fs from
  src\services\bursa\bursaRevenueRevisionSnapshotStore.ts:
  fs could not be found within the project or in these directories:
  node_modules

> import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
```

**Import チェーン:**

```
bursaRevenueRevisionSnapshotStore.ts
  ← bursaRevenueRevisionProviders.ts
    ← bursaEarningsRevisionIntelligenceProviders.ts
      ← … ← bursaMaterialAnalysisService.ts
        ← BursaMaterialContext.tsx ← App.tsx
```

**根本原因:** Phase23 Revenue Revision で追加したスナップショット store が **Node.js 専用 `fs` をトップレベル import**。CLI（`tsx` / vitest）では動作するが、**React Native release bundle（Metro）では `fs` は存在しない**。

| 環境 | 結果 |
|------|------|
| E2E CLI (`tsx`) | PASS — Node 上で `fs` 利用可 |
| 実機 Metro dev | 影響は限定的（dev バンドル経路） |
| **`gradlew assembleRelease`** | **FAIL** — release JS bundle に `fs` を含められない |

> **補足:** 以前の UI スモークで「v15 APK に Phase24 UI なし」と判明した問題は、**ビルド失敗とは別件**（v15 が Phase24 以前 commit から EAS ビルドされたため）。最新 commit を bundle できれば Phase24/23.1 UI は同梱される。

---

### 1.2 【第二原因 · 過去確認】Windows MAX_PATH（260 文字）

| 項目 | 値 |
|------|-----|
| `LongPathsEnabled`（レジストリ） | **0（無効）** |
| プロジェクトルートパス長 | 57 文字 |
| `newArchEnabled` | **true**（`gradle.properties`） |
| ネイティブ `.cxx` 最大パス（参考） | ~201 文字（今回計測） |

Expo SDK 54 + New Architecture では CMake/ninja が **260 文字超パス**を生成しうる。今回のビルドは **bundle 段階で先に失敗**したため ninja 未到達だが、**bundle 修正後に native リンクで再発するリスクあり**。

**過去エラー例（`PRODUCTION_AAB_BUILD_REPORT.md`）:**

```
ninja: error: ... Filename longer than 260 characters
```

---

### 1.3 【第三原因 · 再現済】`subst S:` 短縮パス + settings.gradle

```powershell
subst S: "C:\Users\k416m\Documents\Projects\stock-trading-assistant"
cd S:\android
.\gradlew.bat tasks
```

**結果:** `Settings file 'S:\android\settings.gradle' line: 32` — `Process 'command 'cmd'' finished with non-zero exit value 1`

**原因:** `settings.gradle` が `pluginManagement` 内で **node を cmd 経由実行**し `@react-native/gradle-plugin` / `expo-modules-autolinking` のパスを解決。**SUBST 仮想ドライブ上では node 解決が失敗**する（同一 repo を `C:\` 実パスでは settings 評価成功）。

| パス | settings.gradle |
|------|-----------------|
| `C:\Users\k416m\Documents\Projects\stock-trading-assistant\android` | **OK** |
| `S:\android`（subst） | **FAIL** |

---

### 1.4 【参考】その他ブロック経路

| 方式 | 結果 |
|------|------|
| `eas build --local` | **非対応** — macOS/Linux のみ |
| EAS cloud preview/production | **quota exhausted**（2026-07-01 まで待ち） |

---

## 2. Windows 修正手順（推奨順）

### Step A — bundle ブロッカー解消（必須）

`src/services/bursa/bursaRevenueRevisionSnapshotStore.ts` から **トップレベル `import 'fs'` を除去**し、RN では in-memory のみ動作させる。

**推奨パターン（いずれか）:**

1. **Platform 分離** — `bursaRevenueRevisionSnapshotStore.native.ts`（memory only）/ `.node.ts`（fs + ファイル）を Metro `resolver.resolveRequest` または拡張子解決で切替
2. **expo-file-system / AsyncStorage** — 実機永続化が必要なら RN 対応ストレージへ移行
3. **Metro mock** — `metro.config.js` で `fs` → 空 stub（最小 diff だが本番永続化は不可）

**修正後の確認:**

```powershell
npx expo export --platform android --output-dir .expo-export-test
# または
cd android
.\gradlew.bat :app:createBundleReleaseJsAndAssets
```

---

### Step B — Long Path 有効化（推奨 · 管理者）

PowerShell（管理者）:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
# 再起動推奨
```

Git も有効化:

```powershell
git config --global core.longpaths true
```

---

### Step C — Release APK ビルド

```powershell
cd C:\Users\k416m\Documents\Projects\stock-trading-assistant

# 依存関係
npm ci

# （任意）ネイティブ同期 — android/ 既存なら省略可
# npx expo prebuild --platform android --no-install

# Preview 相当 env（12h monitor 有効）
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR = "1"

cd android
.\gradlew.bat assembleRelease -x lint -x test
```

**出力（成功時）:**

```
android\app\build\outputs\apk\release\app-release.apk
```

**versionCode 確認:**

```powershell
# aapt2 またはインストール後
adb install -r android\app\build\outputs\apk\release\app-release.apk
adb shell dumpsys package com.assistant.stocktrading | findstr versionCode
# 期待: versionCode=16
```

**署名:** 現行 `android/app/build.gradle` の `release` は **debug keystore** を使用 — 実機 smoke / 内部配布用として可（Play 提出不可）。

**artifacts へコピー:**

```powershell
New-Item -ItemType Directory -Force -Path artifacts | Out-Null
Copy-Item android\app\build\outputs\apk\release\app-release.apk artifacts\preview-v16-local.apk
```

---

### Step D — 代替（Windows 上）

| 方式 | 手順 | 備考 |
|------|------|------|
| **WSL2** | Ubuntu 内で clone → `npm ci` → `./gradlew assembleRelease` | **同じ `fs` bundle 修正が必要**。パスは `/home/...` 推奨 |
| **短パス clone** | `C:\sta\stock-trading-assistant` に clone | `subst` より安全。LongPaths + bundle 修正と併用 |
| **GitHub Actions** | `ubuntu-latest` + `eas build` または Gradle | quota 回復後が現実的 |
| **EAS 待ち** | 2026-07-01 以降 `npx eas-cli build -p android --profile preview` | 最も確実 |

**非推奨:** `subst S:` — settings.gradle node 解決が壊れる。

---

## 3. 必要コマンド一覧

```powershell
# --- 診断 ---
node -v                                    # v24.x 確認
java -version                              # JDK 17 確認
(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem LongPathsEnabled).LongPathsEnabled

# --- bundle 単体確認（修正後）---
cd android
.\gradlew.bat :app:createBundleReleaseJsAndAssets

# --- release APK（修正後）---
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR = "1"
.\gradlew.bat assembleRelease

# --- 実機 ---
adb install -r ..\android\app\build\outputs\apk\release\app-release.apk
adb shell dumpsys package com.assistant.stocktrading | findstr versionCode

# --- UI 再検証 ---
node scripts/bursa-phase11-ui-visibility-verify.mjs
```

---

## 4. APK 生成可否マトリクス

| 条件 | versionCode 16 ローカル APK |
|------|----------------------------|
| **現状（`fs` import あり）** | **不可** — bundle FAIL |
| **`fs` 修正 + LongPaths OFF** | **おそらく可**（今回 native 未到達だが .cxx ~201 文字） |
| **`fs` 修正 + LongPaths ON** | **推奨 · 可** |
| **`fs` 修正 + ninja MAX_PATH 再発** | 短パス clone または WSL2 |
| **EAS preview（7/1 以降）** | **可** — 署名・quota 込み |

---

## 5. versionCode 16 について

| ソース | versionCode |
|--------|-------------|
| `app.json` | **16** |
| `android/app/build.gradle` `defaultConfig` | **16** |
| 実機（preview-v15） | 15 |
| ローカル未生成 APK | **なし** |

Gradle 設定は **16 ビルド準備済**。bundle 修正後の `assembleRelease` 成功時点で **versionCode 16 APK が生成される**。

---

## 6. 推奨アクション

| 優先 | アクション | 効果 |
|------|------------|------|
| **P0** | `bursaRevenueRevisionSnapshotStore.ts` の `fs` を RN 非依存化 | bundle PASS |
| **P1** | LongPathsEnabled = 1 + 再起動 | ninja MAX_PATH 予防 |
| **P2** | `gradlew assembleRelease` → `artifacts/preview-v16-local.apk` | Phase24 UI 同梱実機 APK |
| **P3** | `bursa-phase11-ui-visibility-verify.mjs` 再実行 | UI VALIDATION 完遂 |

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| 調査時 HEAD | **`6c2e5c1`** |
| 本レポート commit | **（提出コミット — push 後更新）** |
| Push | **（push 結果参照）** |
