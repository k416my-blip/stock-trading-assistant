# HyperOS 画面オフ生存レポート

作成日: 2026-06-15  
対象端末: Redmi Note 13 Pro (HyperOS) · `FYRWXSNNAIOR9DCM`  
パッケージ: `com.assistant.stocktrading` · versionCode **9**

---

## 1. HyperOS 調査所見

| 項目 | 内容 |
|------|------|
| 問題 | `adb shell svc power stayon` 等の画面常時点灯は HyperOS が無視する |
| 症状 | 画面オフ約14分後に PID 消失・タイマー停止・ネットワークポーリング停止（v8 以前） |
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
```

手順: adb 接続 → v9 APK インストール → 画面オフ → 16分（2分間隔ポーリング）→ 証跡を `docs/review/hyperos-screen-off-survival/` に保存

---

## 3. EAS ビルド（preview v9）

| 項目 | 値 |
|------|-----|
| ビルド ID | `5ce9db86-f2bb-49fb-8594-6345902aae21` |
| ステータス | **FINISHED** |
| プロファイル | `preview` (APK) |
| appBuildVersion | 9 |
| APK | `artifacts/preview-v9.apk` (約 77 MB) |
| ログ | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/5ce9db86-f2bb-49fb-8594-6345902aae21 |

---

## 4. 検証結果（FYRWXSNNAIOR9DCM · v9 · 16分画面オフ）

実行: `20260615-160913` · `waitMinutes=16`

| チェック | 結果 |
|----------|------|
| 端末接続 | ✅ |
| v9 APK インストール | ✅ |
| ベースライン PID | `20263` |
| 16分後 PID | `20263`（**安定**） |
| `[12H-MONITOR] heartbeat` | **4 行**（画面オフ中も継続） |
| `survival_status` | **1 行** |
| ネットワーク活動ログ | ✅ |
| 14分超過後もプロセス生存 | ✅（従来 ~14分で落ちる問題を超過） |

**総合判定: PASS**

証跡:

- `docs/review/hyperos-screen-off-survival/result-20260615-160913.json`
- `docs/review/hyperos-screen-off-survival/poll-20260615-160913.jsonl`
- `docs/review/hyperos-screen-off-survival/logcat-tail-20260615-160913.txt`

補足: 起動直後の logcat では `survival_enabled` 文字列が検出されない場合があるが、`survival_status` と PID 安定・heartbeat 継続により native 生存機構は機能している。

---

## 5. GitHub 同期

| 項目 | 値 |
|------|-----|
| 実装コミット | `b0761c5` |
| レポートコミット | `b3a1f3e` |
| メッセージ | `hyperos: add wake lock and foreground service for screen-off long-run survival` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| push | ✅ `origin/cursor/top3-maxdd-capital-audit` |

---

## 6. 運用メモ

- 画面常時点灯は不要（HyperOS が adb stay-on を無視するため）
- 12h 本番テスト前に `npm run verify:hyperos-screen-off` で 16 分スモークを推奨
- `VERIFY_HYPEROS_MINUTES=2` は短縮スモーク用（heartbeat 閾値は自動緩和）
