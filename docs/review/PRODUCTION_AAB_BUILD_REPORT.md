# Production AAB Build Report

**実施日:** 2026-06-19  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**コマンド:** `npm run build:android:production` → `npx eas-cli build -p android --profile production`

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| production AAB 生成 | **未完了** — EAS 無料枠 exhausted + ローカル Gradle Windows パス制限 |
| versionCode（意図） | **16**（EAS autoIncrement · `app.json` 同期済み） |
| monitor 無効設定 | **設定 OK** — `eas.json` production env = `"0"` |
| Play 提出用 AAB ファイル | **なし**（本レポート時点） |

---

## 1. 実施内容

### 1.1 事前修正

| 変更 | 内容 |
|------|------|
| `eas.json` | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` を `""` → `"0"`（EAS が空文字 env を拒否） |
| `package.json` | `eas` → `npx eas-cli`（Windows PATH 未設定対策） |
| `app.json` | `versionCode` **16**（EAS upload 時に 15→16 bump を確認） |

### 1.2 EAS クラウドビルド（production）

```powershell
npm run build:android:production -- --non-interactive --wait
```

| ステップ | 結果 |
|----------|------|
| eas.json 検証 | 初回 FAIL（空 env）→ 修正後 PASS |
| プロジェクト upload | **成功**（~31.6 MB） |
| Remote credentials | **成功** — Keystore `Build Credentials MB3l4Jyy6N` |
| versionCode bump | 15 → **16**（EAS ログ確認） |
| ビルドキュー | **FAIL** — Free plan Android builds 今月分 exhausted |

**エラーメッセージ:**

> This account has used its Android builds from the Free plan this month, which will reset in **11 days (Wed Jul 01 2026)**.

`apk` profile も同一 quota で **FAIL**（確認済み）。

### 1.3 ローカルビルド代替（試行）

| 方式 | 結果 |
|------|------|
| `eas build --local` | **FAIL** — Windows 非対応（macOS/Linux のみ） |
| `expo prebuild` + `gradlew bundleRelease assembleRelease` | **FAIL** — Windows MAX_PATH（260 文字）· CMake/ninja |
| `subst S:` 短縮パス | **FAIL** — settings.gradle node パス評価エラー |

**Gradle エラー（抜粋）:**

```
ninja: error: ... Filename longer than 260 characters
```

---

## 2. AAB 生成結果

| 項目 | 値 |
|------|-----|
| AAB ファイル | **未生成** |
| 出力パス（想定） | EAS artifact URL または `android/app/build/outputs/bundle/release/app-release.aab` |
| 署名 | EAS remote keystore（クラウドビルド成功時） |
| 代替 artifact | `artifacts/preview-v15.apk`（versionCode **15** · monitor **有効** — production 非該当） |

---

## 3. versionCode

| ソース | versionCode |
|--------|-------------|
| `app.json`（現在） | **16** |
| 実機インストール（preview-v15） | **15** |
| EAS production 次回ビルド | **16**（autoIncrement 済み宣言） |

---

## 4. monitor 無効確認

### 4.1 ビルド設定（静的）

| Profile | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | 有効条件 |
|---------|------------------------------------------|----------|
| preview | `"1"` | `=== '1'` → **有効** |
| **production** | `"0"` | `=== '1'` → **無効** |
| apk | `"0"` | **無効** |

参照: `src/constants/twelveHourTestMonitor.ts`

### 4.2 実行時 logcat（参考 · preview-v15）

production AAB 未生成のため **preview-v15** で参考計測:

| 計測 | 結果 |
|------|------|
| `[12H-MONITOR]` 行数（45s 起動後） | **10** |
| 解釈 | preview は monitor **有効** — production ビルド後 **0 であること** を再検証必須 |

**production AAB 取得後の確認コマンド:**

```powershell
adb logcat -c
adb shell am start -n com.assistant.stocktrading/.MainActivity
Start-Sleep -Seconds 60
adb logcat -d -v brief | findstr 12H-MONITOR
# 期待: 出力なし（0 行）
```

---

## 5. 次アクション（AAB 取得）

| 優先 | アクション |
|------|------------|
| **A** | **Jul 01 2026** 以降 `npm run build:android:production` 再実行 |
| **B** | EAS Production / Starter プランで quota 追加 |
| **C** | macOS/Linux CI または WSL2 + 短パス clone で Gradle `bundleRelease` |
| **D** | 成功後 `eas submit --platform android --profile production` |

---

## GitHub sync

_(filled after commit/push)_
