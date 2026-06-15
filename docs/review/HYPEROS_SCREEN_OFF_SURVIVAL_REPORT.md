# HyperOS 画面オフ生存レポート

作成日: 2026-06-15  
対象端末: Redmi Note 13 Pro (HyperOS) · `FYRWXSNNAIOR9DCM`  
パッケージ: `com.assistant.stocktrading` · versionCode **9**

---

## 1. HyperOS 調査所見

| 項目 | 内容 |
|------|------|
| 問題 | `adb shell svc power stayon` 等の画面常時点灯は HyperOS が無視する |
| 症状 | 画面オフ約14分後に PID 消失・タイマー停止・ネットワークポーリング停止 |
| 目標 | **画面は消したまま** 12時間監視（PID・heartbeat・価格/ニュース取得）を維持 |
| 方針 | PARTIAL_WAKE_LOCK + Foreground Service（低優先度通知）+ JS タイマー継続 |

---

## 2. 実装サマリー

### 2.1 expo-keep-awake

- `expo-keep-awake` を導入
- `src/services/longRunSurvival.ts` で **デフォルト無効**（`screenAwake: false`）
- オプション `screenAwake: true` で画面点灯モードを有効化可能

### 2.2 sta-native-runtime（Android）

| ファイル | 役割 |
|----------|------|
| `StaNativeRuntimeModule.kt` | `getSnapshot`, wake lock, FG service, `getSurvivalStatus`, trim/lifecycle イベント |
| `LongRunForegroundService.kt` | 通知チャンネル `long_run_survival` · `dataSync` 型 FG サービス |
| `AndroidManifest.xml` | WAKE_LOCK / FOREGROUND_SERVICE / POST_NOTIFICATIONS 権限 |

公開 API（`NativeModules.StaNativeRuntime`）:

- `acquirePartialWakeLock(tag)`
- `releasePartialWakeLock()`
- `startLongRunForegroundService(title?, body?)`
- `stopLongRunForegroundService()`
- `getSurvivalStatus()` → `{ wakeLockHeld, foregroundServiceRunning }`

### 2.3 JS 統合

- `src/services/longRunSurvival.ts` — 生存モード enable/disable
- `src/services/twelveHourTestMonitor.ts` — 監視開始時に `enableLongRunSurvival`、停止時に `disable`
- `src/native/runtime/nativeRuntimeBridge.ts` — `NativeModuleShape` に survival メソッド追加
- ログ: `[12H-MONITOR] survival_enabled` / `survival_status`

### 2.4 app.json

- `versionCode`: 8 → **9**
- Android 権限: `WAKE_LOCK`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`

### 2.5 検証スクリプト

```bash
npm run verify:hyperos-screen-off
# 短縮: VERIFY_HYPEROS_MINUTES=2 node scripts/verify-hyperos-screen-off-survival.mjs
```

手順: adb 接続 → APK インストール → `survival_enabled` 待機 → 画面オフ → 16分（2分間隔ポーリング）→ 証跡を `docs/review/hyperos-screen-off-survival/` に保存

---

## 3. EAS ビルド（preview v9）

| 項目 | 値 |
|------|-----|
| ビルド ID | `5ce9db86-f2bb-49fb-8594-6345902aae21` |
| プロファイル | `preview` (APK) |
| appBuildVersion | 9 |
| ログ | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/5ce9db86-f2bb-49fb-8594-6345902aae21 |

ビルド完了後:

```bash
npx eas-cli build:download --id 5ce9db86-f2bb-49fb-8594-6345902aae21 --output artifacts/preview-v9.apk
adb -s FYRWXSNNAIOR9DCM install -r artifacts/preview-v9.apk
npm run verify:hyperos-screen-off
```

---

## 4. 検証結果

| チェック | v8（実装前） | v9（native 同梱後） |
|----------|-------------|---------------------|
| 端末接続 `FYRWXSNNAIOR9DCM` | ✅ | ✅ |
| `survival_enabled` logcat | ❌ 未検出（native 未同梱） | ⏳ ビルド後に再検証 |
| PID 安定（16分画面オフ） | ❌ 既知問題 | ⏳ ビルド後に再検証 |
| heartbeat 継続 | 部分（画面オフ後停止傾向） | ⏳ ビルド後に再検証 |
| ネットワーク活動ログ | 画面オフ後に停滞 | ⏳ ビルド後に再検証 |

**総合判定（本レポート作成時点）: PENDING** — コード実装・Git 同期完了。実機 PASS/FAIL は preview v9 APK インストール後の 16 分検証で確定。

証跡ディレクトリ: `docs/review/hyperos-screen-off-survival/`

---

## 5. GitHub 同期

| 項目 | 値 |
|------|-----|
| コミット | `b0761c5` |
| メッセージ | `hyperos: add wake lock and foreground service for screen-off long-run survival` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| push | ✅ `origin/cursor/top3-maxdd-capital-audit` |

---

## 6. 次のアクション

1. EAS ビルド完了を待つ → `artifacts/preview-v9.apk` を取得
2. `npm run verify:hyperos-screen-off`（16分）を実行
3. 本レポート §4 の表を PASS/FAIL で更新
