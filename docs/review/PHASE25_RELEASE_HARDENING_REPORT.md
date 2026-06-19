# Phase 25 — Production Release Hardening Report

**実施日:** 2026-06-19  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**方針:** NEXT_PHASE_RECOMMENDATION.md **Option A** — P0 を優先順に実施

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| P0-1 Release build flavor | **完了** — preview / production / apk を env で分離 |
| P0-2 Play Internal Testing 準備 | **ドキュメント化完了** — AAB コマンド整備 · 投入は **条件付き** |
| P0-3 Orchestrator exit code | **完了** — 全ゲート PASS 時 `phase12_5ExitCode=null` でも exit 0 |
| P0-4 API Key Secure Storage | **監査完了** — Commit24 実装は repo 内で完結 · 実機 reinstall smoke は未実施 |
| Play Internal Testing 投入可否 | **条件付き NO**（下記ブロッカー参照） |

---

## P0-1: Release build flavor

### 実施内容

| 変更 | 内容 |
|------|------|
| `eas.json` | **preview:** `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` · **production / apk:** 空文字（monitor 無効） |
| `eas.json` | 全 Android profile に `credentialsSource: remote`（EAS 管理署名） |
| `eas.json` | production = `app-bundle` · preview/apk = `apk`（既存方針を明示化） |
| `package.json` | `build:android:production` · `build:android:apk` npm script 追加 |
| `tests/unit/releaseBuildFlavor.test.ts` | profile 別 env / buildType の回帰テスト |

### ビルドコマンド

```powershell
# QA / 12h 検証用（monitor 有効）
npm run build:android:preview

# Play Store 内部テスト用 AAB（monitor 無効）
npm run build:android:production

# 本番相当 APK スモーク（monitor 無効）
npm run build:android:apk
```

### 検証

- preview-v15.apk（versionCode 15）は `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` bake-in 済み — **release には使用しない**
- production profile では monitor フラグが `=== '1'` にならない設計（`twelveHourTestMonitor.ts` · `phase125StabilityTest.ts`）

---

## P0-2: Google Play Internal Testing 準備

### AAB 生成

| 項目 | 状態 |
|------|------|
| EAS profile | `production` — `distribution: store` · `buildType: app-bundle` · `autoIncrement: true` |
| npm script | `npm run build:android:production` |
| 提出コマンド（参考） | `eas submit --platform android --profile production` |
| 実 AAB ビルド | **未実行**（EAS クォータ / リリースオーナー承認待ち） |

### Internal Testing Track パッケージ準備

| 項目 | 状態 |
|------|------|
| package | `com.assistant.stocktrading`（`app.json`） |
| version | `1.0.0` · versionCode 15（preview）— production は EAS autoIncrement |
| 掲載素材 | `GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` に文案草案あり |
| スクリーンショット / フィーチャーグラフィック | **未作成** |

### Data Safety チェックリスト（レビュー結果）

Play Console 入力用の調査結果（repo 監査ベース）:

| データ種別 | 収集 | 保存場所 | 開示要否 |
|------------|------|----------|----------|
| ユーザー入力 API キー | はい（任意） | expo-secure-store（端末ローカル） | **必須** — 暗号化ローカル保存 |
| ポートフォリオ / 約定記録 | はい | AsyncStorage（端末ローカル） | **必須** — 金融データローカル |
| 市場データリクエスト | はい | ネットワーク送信 · キャッシュ | **必須** — 第三者（Yahoo / Twelve Data 等） |
| AI プロンプト / 設定 | はい | ネットワーク（OpenAI 等） | **必須** — ユーザー提供コンテンツ |
| 通知トークン | 可能性あり | expo-notifications | **要確認** — POST_NOTIFICATIONS |
| 12h 監視 telemetry | preview のみ | logcat（開発検証） | **release では無効** — production では収集しない |
| アカウント登録 / ログイン | なし | — | 収集しないと申告可 |

**権限（`app.json`）:** `WAKE_LOCK` · `FOREGROUND_SERVICE` · `FOREGROUND_SERVICE_DATA_SYNC` · `POST_NOTIFICATIONS`

**未完了:** Play Console Data Safety フォームへの実入力 · 第三者 SDK 一覧の最終確定

### Privacy Policy レビュー

| 項目 | 状態 |
|------|------|
| repo 内プライバシーポリシー HTML/MD | **なし** |
| アプリ内免責 / 非公式声明 | `src/constants/disclaimers.ts` · `platformClarification.ts` |
| ポートフォリオ intel ローカル限定注記 | `PORTFOLIO_INTEL_PRIVACY_JA`（`portfolioIntelligence.ts`） |
| Play 必須 URL | **未ホスト** — GitHub Pages / Notion / 独自ドメイン等で公開が必要 |
| 参照ガイド | `PLAY_STORE_SUBMISSION_GUIDE.md` · `INTERNAL_TESTING_GUIDE.md` |

### Play Console 投入ブロッカー（credentials なしのため未アップロード）

1. プライバシーポリシー URL 未公開  
2. Data Safety フォーム未入力  
3. production AAB の EAS クラウドビルド未実施  
4. スクリーンショット · コンテンツレーティング · サポート連絡先  
5. Play Console サービスアカウント / 提出 credentials（repo 外）

---

## P0-3: Orchestrator exit code fix

### 実施内容

| ファイル | 変更 |
|----------|------|
| `scripts/verify-hyperos-v9-3h-screen-off.mjs` | `resolveOrchestratorProcessExitCode()` 追加 |
| 同上 | `finalizeRun` — 既に終了済みの `phaseChild.exitCode` を `ev.phase12_5ExitCode` にコピー |
| 同上 | `process.exitCode` — `eval_.overall === true` かつ `phase12_5ExitCode` が `null` または `0` なら **0** |
| `scripts/finalize-hyperos-v15-3h-from-evidence.mjs` | 末尾 `process.exitCode` 追加 |
| `scripts/finalize-hyperos-v15-3h-rerun-from-evidence.mjs` | 同上（APP + ORCH 両 PASS 時 0） |
| `tests/unit/orchestratorExitCode.test.ts` | 4 ケース — null 許容 · 非ゼロ child exit は FAIL 維持 |

### ロジック（real failure をマスクしない）

```
overall=false          → exit 1
phase12_5ExitCode=1    → exit 1（子プロセス失敗）
phase12_5ExitCode=null → exit 0（overall=true のみ）
phase12_5ExitCode=0    → exit 0
```

### テスト結果

```text
vitest tests/unit/orchestratorExitCode.test.ts — 4/4 PASS
vitest tests/unit/releaseBuildFlavor.test.ts — 2/2 PASS
```

---

## P0-4: API Key Secure Storage（Commit24 残作業）

### 監査結果

Commit24（`COMMIT24_API_KEY_PERSISTENCE_AND_SAFE_STORAGE_REPORT.md`）のコード変更は **repo 内で完結済み**:

| 領域 | 状態 |
|------|------|
| 保存経路 | `safeApiKey` → `secretStorage`（SecureStore 優先 · レガシー AsyncStorage は migrate-on-read のみ） |
| UI | draft 入力 · マスク表示（`apiKeyUiState.ts`）· 実キー非ロード |
| reset | `resetAllAppData(false)` — API キー保持 |
| 明示削除 | `deleteAllApiKeysUserConfirmed(true)` のみ |
| 読取失敗 | auto-purge **停止**（`secretStorage.ts`） |
| 平文 AsyncStorage 新規書込 | **なし**（grep 監査） |

### 追加実施（Phase 25）

- SecureStore / persistence ユニットテスト再実行 — **11/11 PASS**（safeApiKey + apiKeyPersistence）
- release flavor 分離により stability test mode（API キー UI 抑制）は **preview のみ**

### 実機 reinstall 永続化確認手順（release AAB / preview 共通）

1. APK/AAB をインストール（同一署名 · `adb install -r` 可）
2. 設定 → API キー画面で Twelve Data / OpenAI 等を入力 → 保存
3. 「設定済み（****last4）」表示を確認
4. `adb shell am force-stop com.assistant.stocktrading` → 再起動 → 設定済み表示維持を確認
5. 株価更新 smoke → キー未設定警告が出ないこと
6. **完全アンインストール** → 再インストール → キー消失（Android 仕様）を確認
7. `adb install -r` 上書き → キー **保持** を確認

**未実施:** production AAB ビルド後の実機 smoke（Phase 25 範囲外 · 次アクション）

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| commit | `b7998ba2f12fe449d000938d0ffaa0239d4cccfb` |
| push | **成功** — `origin/cursor/top3-maxdd-capital-audit`（`88615fd..b7998ba`） |
| 変更ファイル | `eas.json` · `package.json` · orchestrator scripts ×3 · tests ×2 · 本レポート |

---

## Play Internal Testing 投入可否

**判定: 条件付き NO**

| 条件 | 状態 |
|------|------|
| Release flavor（monitor 除去） | **OK** — eas.json 設定済み |
| AAB ビルドパイプライン | **OK** — コマンド整備済み · 実ビルド未実施 |
| プライバシーポリシー URL | **NG** |
| Data Safety フォーム | **NG** |
| ストア掲載素材（スクショ等） | **NG** |
| Play Console credentials | **NG** — 本 repo からはアップロード不可 |

**投入可能になる条件:** 上記 NG 3 項目の解消 + `npm run build:android:production` 成功 + Internal Testing track へ手動アップロード

---

## 残課題一覧

| 優先度 | 課題 |
|--------|------|
| P0 | EAS production AAB 初回ビルド + monitor 無効の logcat 確認 |
| P0 | プライバシーポリシー URL 公開 + Play Console 登録 |
| P0 | Data Safety フォーム入力（上記チェックリストベース） |
| P0 | スクリーンショット · コンテンツレーティング · サポート連絡先 |
| P1 | production AAB 実機 API キー reinstall smoke |
| P1 | 第二デバイス 3h screen-off（NEXT_PHASE P1-5） |
| P1 | Phase24 live analyst consensus API |
| P2 | ストア正式名称 · Rakuten 表記の商標確認 |
| P2 | 英語 store listing |

---

## 参照

- `docs/review/NEXT_PHASE_RECOMMENDATION.md`
- `docs/review/COMMIT24_API_KEY_PERSISTENCE_AND_SAFE_STORAGE_REPORT.md`
- `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md`
- `docs/review/ANDROID_RELEASE_PIPELINE.md`
- `docs/review/FINAL_12H_VALIDATION_REPORT.md`
