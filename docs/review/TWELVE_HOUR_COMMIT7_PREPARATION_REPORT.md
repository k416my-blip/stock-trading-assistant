# Commit 7 準備レポート — Twelve-Hour Test Monitor

監査日: 2026-06-02  
コミット予定メッセージ: `twelve-hour-test-monitor: add runtime monitor and live API audit tooling`  
実施範囲: **準備・精査のみ**（`git add` / `commit` / `push` は **未実施**）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD | `125470171dad71ba51b795ffb4d9f2be7bfd158f` — **PASS** |
| remote 同期 | `0	0` — **PASS** |
| Commit 7 候補 | **24 件**（5 modified / 19 untracked） |
| 24 件内部依存グラフ | **閉じている — PASS** |
| 24 件のみ isolated typecheck | **FAIL**（`newsApiEverythingTest.ts` 不足 — §6） |
| 現行 worktree（全差分込み）の Commit 7 関連 typecheck | **PASS**（該当ファイルにエラー 0） |
| package.json scripts ↔ 実体 | **部分 FAIL**（`device-live-api-audit.mjs` が候補外 — §5） |
| シークレットスキャン | **PASS** |
| unit test（3 ファイル） | **13/13 PASS** |
| 残存 ` D` 2 件の除外 | **確認済み — PASS** |
| **commit 準備可否** | **CONDITIONAL PASS**（§12 参照。実行前に §6 の依存ギャップを解消推奨） |

---

## 1. HEAD 確認

```
125470171dad71ba51b795ffb4d9f2be7bfd158f
```

期待値と一致（Commit 6 = Phase13–23 dependency fix）。

---

## 2. remote 同期確認

```bash
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
```

| 結果 | 期待値 | 判定 |
|------|--------|------|
| `0	0` | `0 0` | **PASS** |

---

## 3. Commit 7 候補一覧

| # | パス | 状態 | 行数 | 差分規模 |
|---|------|------|------|----------|
| 1 | `src/context/BursaMaterialContext.tsx` | M | 89 | +18 / −2 |
| 2 | `src/context/ProactiveConciergeContext.tsx` | M | 3106 | +11 / −2 |
| 3 | `src/screens/SettingsScreen.tsx` | M | 950 | +21 |
| 4 | `src/constants/storageKeys.ts` | M | 94 | +1 key |
| 5 | `src/services/twelveHourTestMonitor.ts` | ?? | 64 | 新規 |
| 6 | `src/services/twelveHourTestMonitorCore.ts` | ?? | 374 | 新規 |
| 7 | `src/services/twelveHourTestMonitorPersistence.ts` | ?? | 35 | 新規 |
| 8 | `src/types/twelveHourTestMonitor.ts` | ?? | 40 | 新規 |
| 9 | `src/constants/twelveHourTestMonitor.ts` | ?? | 9 | 新規 |
| 10 | `src/hooks/useTwelveHourTestRuntime.ts` | ?? | 38 | 新規 |
| 11 | `src/services/deviceLiveApiAudit.ts` | ?? | 213 | 新規 |
| 12 | `src/constants/deviceLiveApiAudit.ts` | ?? | 5 | 新規 |
| 13 | `src/constants/newsApiRateLimit.ts` | ?? | 41 | 新規 |
| 14 | `src/components/BursaDataErrorBoundary.tsx` | ?? | 82 | 新規 |
| 15 | `tests/unit/twelveHourTestMonitor.test.ts` | ?? | 85 | 新規 |
| 16 | `tests/unit/newsApiRateLimit.test.ts` | ?? | 26 | 新規 |
| 17 | `tests/unit/phase12Stability.test.ts` | ?? | 177 | 新規 |
| 18 | `package.json` | M | 170 | +6 scripts |
| 19 | `scripts/twelve-hour-test-preflight-verify.ts` | ?? | 188 | 新規 |
| 20 | `scripts/twelve-hour-api-key-audit.mjs` | ?? | 12 | 新規 |
| 21 | `scripts/verify-material-fallback-without-newsapi.ts` | ?? | 214 | 新規 |
| 22 | `scripts/newsapi-429-diagnosis.mjs` | ?? | 303 | 新規 |
| 23 | `scripts/git-safe-sync-after-report.mjs` | ?? | 486 | 新規 |
| 24 | `scripts/phase12-stability-test.mjs` | ?? | 296 | 新規 |

**ファイル件数: 24**

---

## 4. 各ファイルの役割

### 4.1 アプリランタイム（Twelve-Hour 監視）

| ファイル | 役割 |
|----------|------|
| `twelveHourTestMonitorCore.ts` | 心拍・stall 警告・sleep 検知・レポート生成（RN 非依存コア） |
| `twelveHourTestMonitorPersistence.ts` | AsyncStorage へのスナップショット永続化 |
| `twelveHourTestMonitor.ts` | AppState 連携・起動/停止 API・各所からの note 関数の re-export |
| `twelveHourTestMonitor.ts`（types/constants） | 型定義・閾値定数・`EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` フラグ |
| `useTwelveHourTestRuntime.ts` | 12h テスト中の株価ポーリング継続 hook |
| `storageKeys.ts` | `twelveHourTestMonitor` storage key 追加 |

### 4.2 コンテキスト / UI 配線

| ファイル | 役割 |
|----------|------|
| `BursaMaterialContext.tsx` | `noteTwelveHourNewsFetch` / 1h リフレッシュ / `mapBursaAnalysisError` 統合 |
| `ProactiveConciergeContext.tsx` | バックグラウンド時の `isTwelveHourBackgroundOpsAllowed` 例外 / AI note |
| `SettingsScreen.tsx` | 「実機監査（6銘柄）」ボタン → `runDeviceLiveApiAudit` |
| `BursaDataErrorBoundary.tsx` | Bursa 画面用エラー境界 + `wrapBursaScreen` ヘルパー |

### 4.3 実機ライブ API 監査

| ファイル | 役割 |
|----------|------|
| `deviceLiveApiAudit.ts` | SecureStore キーで NewsAPI / X / 6 銘柄ニュースを実機 fetch |
| `deviceLiveApiAudit.ts`（constants） | ログタグ・`EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT` フラグ |
| `newsApiRateLimit.ts` | NewsAPI 429 `rateLimited` 一時制限の分類定数 |

### 4.4 検証スクリプト / npm scripts

| ファイル | 役割 |
|----------|------|
| `twelve-hour-test-preflight-verify.ts` | 12h テスト前の preflight チェック |
| `twelve-hour-api-key-audit.mjs` | Node 側 API キー監査ラッパー |
| `verify-material-fallback-without-newsapi.ts` | NewsAPI なし material fallback 検証 |
| `newsapi-429-diagnosis.mjs` | 429 診断ツール |
| `git-safe-sync-after-report.mjs` | `sync:report` — レポート後の安全 git 同期 |
| `phase12-stability-test.mjs` | Phase12 安定性 Node テスト（既存 script の差分版） |
| `package.json` | 上記を呼ぶ npm scripts 6 本追加 |

### 4.5 テスト

| ファイル | 役割 |
|----------|------|
| `twelveHourTestMonitor.test.ts` | コア監視ロジック 6 ケース |
| `newsApiRateLimit.test.ts` | 429 分類 2 ケース |
| `phase12Stability.test.ts` | AI/価格/NewsAPI/X API 安定性 5 ケース |

---

## 5. package.json scripts 確認

| npm script | 実体パス | Commit 7 候補 | 一致 |
|------------|----------|---------------|------|
| `verify:twelve-hour-preflight` | `scripts/twelve-hour-test-preflight-verify.ts` | ✅ #19 | **PASS** |
| `verify:device-live-api-audit` | `scripts/device-live-api-audit.mjs` | ❌ 候補外（`??` 存在） | **FAIL** |
| `verify:newsapi-429-diagnosis` | `scripts/newsapi-429-diagnosis.mjs` | ✅ #22 | **PASS** |
| `verify:material-fallback-without-newsapi` | `scripts/verify-material-fallback-without-newsapi.ts` | ✅ #21 | **PASS** |
| `verify:twelve-hour-api-audit` | `scripts/twelve-hour-api-key-audit.mjs` → spawns `device-live-api-audit.mjs` | ✅ #20（子は候補外） | **部分** |
| `sync:report` | `scripts/git-safe-sync-after-report.mjs` | ✅ #23 | **PASS** |
| `verify:phase12` | `scripts/phase12-stability-test.mjs` | ✅ #24 | **PASS** |

> **ギャップ**: `scripts/device-live-api-audit.mjs`（513 行・untracked）は `package.json` と `twelve-hour-api-key-audit.mjs` から参照されるが **Commit 7 24 件に含まれない**。npm `verify:device-live-api-audit` はコミット後に実体欠落で失敗する。

---

## 6. 依存関係

### 6.1 24 件内部グラフ（閉じている）

```
twelveHourTestMonitor.ts
  ├── twelveHourTestMonitorCore.ts
  │     ├── constants/twelveHourTestMonitor.ts
  │     ├── types/twelveHourTestMonitor.ts
  │     └── twelveHourTestMonitorPersistence.ts (dynamic)
  │           └── storageKeys.ts (+1 key)
  └── twelveHourTestMonitorPersistence.ts

useTwelveHourTestRuntime.ts → twelveHourTestMonitor.ts

deviceLiveApiAudit.ts
  ├── constants/deviceLiveApiAudit.ts
  ├── constants/newsApiRateLimit.ts
  └── HEAD 既存: analysisApiKeys, apiKeyValidation, newsApiEverythingTest, xApiSearchRecentTest

BursaMaterialContext / ProactiveConciergeContext / SettingsScreen
  └── 上記 twelveHour / deviceLiveApi モジュール（dynamic import 含む）

BursaDataErrorBoundary.tsx — 自己完結（React のみ）

tests → 対応 src モジュール
scripts → Node / tsx 実行（src を import するものあり）
package.json → scripts パス参照
```

**24 件同士の import 循環なし — PASS**

### 6.2 HEAD 既存への外部依存（Commit 7 に含めない — 問題なし）

| 依存先（HEAD 済み） | 参照元（Commit 7） |
|---------------------|-------------------|
| `bursaAnalysisDiagnostics.mapBursaAnalysisError` | `BursaMaterialContext` |
| `bursaMaterialAnalysisService` | `BursaMaterialContext` |
| `analysisApiKeys` / `apiKeyValidation` | `deviceLiveApiAudit` |
| `newsApiEverythingTest` | `deviceLiveApiAudit` |
| `xApiSearchRecentTest` | `deviceLiveApiAudit` |
| `portfolioPriceRefreshScheduler` / `performanceCostRuntime` | `useTwelveHourTestRuntime` |

### 6.3 依存ギャップ（24 件だけでは不足）

| ファイル | 状態 | 影響 | 重大度 |
|----------|------|------|--------|
| `src/services/newsApiEverythingTest.ts` | `M`（候補外） | `deviceLiveApiAudit` が `news.tempRateLimit` を参照。HEAD 版には当該フィールドなし → **isolated typecheck FAIL** | **高** |
| `scripts/device-live-api-audit.mjs` | `??`（候補外） | `verify:device-live-api-audit` / `twelve-hour-api-key-audit` が参照 | **中** |
| `scripts/loadAuditApiKeys.mjs` | HEAD 既存？ | `device-live-api-audit.mjs` の依存 | 低（HEAD 確認要） |

### 6.4 ランタイム配線ギャップ（機能不完全 — Commit 7 外で意図的除外）

以下は working tree に差分があるが **Commit 7 に含めない**（ユーザー指示通り）。コミット後も **完全な 12h 自動起動は未配線** のまま:

| ファイル | 差分内容 |
|----------|----------|
| `src/context/ProductionStabilityContext.tsx` | `useTwelveHourTestRuntime()` 呼び出し |
| `src/services/productionStability/productionStabilityRuntime.ts` | `startTwelveHourTestMonitor` / `runDeviceLiveApiAudit` 自動起動 |
| `src/navigation/MainTabNavigator.tsx` | `wrapBursaScreen` / `BursaDataErrorBoundary` 適用 |
| `src/services/aiStrategyService.ts` | `noteTwelveHourAiResponse` |
| `src/context/app/useAppApiKeys.ts` | `noteTwelveHourPriceUpdate` |
| `src/services/performanceCostRuntime.ts` | `isTwelveHourBackgroundOpsAllowed` |

> Commit 7 単体でも **Settings 手動監査**・**Material/Concierge からの note**（モニター active 時）は動作可能。自動起動・全画面エラー境界は後続コミット候補。

---

## 7. 除外ファイル一覧

### 7.1 明示除外（Commit 7 に含めない）

| カテゴリ | 件数（dirty tree） | 代表 |
|----------|-------------------|------|
| `forward-validation-*` | 232 | `scripts/forward-validation-*.ts` 等 |
| `openai-*.json` | 0（B/D 整理済み） | — |
| `phase12-5-long-run/**` | 0（untracked 削除済み） | — |
| `ai-enhanced-analysis-device-verify/**` | 0（clean） | — |
| `*.png` / `*.jpg` / `*.log` | 少数（docs 等） | device-live-api-audit docs 等 |
| `.env` | gitignore（status 非表示） | — |
| Phase13–23 監査 docs | 多数 | `docs/review/PHASE13_*` 等 |
| Twelve-Hour 外の横断 `src/` | ~19 | `MainTabNavigator`, `ProductionStabilityContext` 等 |

### 7.2 残存 ` D` 2 件 — Commit 7 に含めない確認

```powershell
git status --porcelain | Select-String "^\sD "
```

| パス | Commit 7 add 案に含む | 判定 |
|------|----------------------|------|
| `scripts/capture-daily-comment-verify-screenshot.mjs` | **含めない** | **PASS** |
| `scripts/kill-metro.ps1` | **含めない** | **PASS** |

---

## 8. シークレットスキャン結果

対象: Commit 7 候補 24 ファイル全文

| パターン | 結果 |
|----------|------|
| `sk-[20+ chars]`（実キー形式） | **0 件** |
| `AIza[30+ chars]` | **0 件** |
| `Bearer ey...`（JWT 形式） | **0 件** |

### 許容ヒット（実キーではない）

| ファイル | 内容 |
|----------|------|
| `newsApiRateLimit.ts` | 定数名 `NEWSAPI_TEMP_RATE_LIMIT` |
| `deviceLiveApiAudit.ts` | `loadAnalysisApiKeys` / `apiKey` 変数名・URL 組み立て |
| `git-safe-sync-after-report.mjs` | シークレット検出用 **正規表現パターン**（`sk-`, `REDDIT_SECRET` 等） |

**シークレットスキャン: PASS**

---

## 9. typecheck 予想

### 9.1 現行 worktree（`newsApiEverythingTest.ts` 差分込み）

```bash
npx tsc --noEmit 2>&1 | Select-String "twelveHour|deviceLiveApi|newsApiRateLimit|BursaDataErrorBoundary|BursaMaterialContext|SettingsScreen|storageKeys"
```

| 結果 | 判定 |
|------|------|
| **該当ファイルのエラー 0 件** | **PASS** |

> 全体 `tsc` は `forward-validation-*`（232 件スコープ外）で **FAIL** 継続。Commit 7 とは無関係。

### 9.2 isolated checkout（Commit 7 の 24 件のみ追加想定）

| 予想 | 理由 |
|------|------|
| **FAIL** | `deviceLiveApiAudit.ts` L159 `news.tempRateLimit` — HEAD の `NewsApiEverythingTestResult` に `tempRateLimit?` 未定義 |

### 9.3 解消案（commit 前推奨）

**A（推奨）**: `src/services/newsApiEverythingTest.ts` を Commit 7 に同梱（実質 25 件）  
**B**: `deviceLiveApiAudit.ts` から `news.tempRateLimit` 参照を削除し `errorReason === NEWSAPI_TEMP_RATE_LIMIT` のみに簡略化

---

## 10. unit test 対象

### 10.1 実行結果（準備時）

```bash
npx vitest run tests/unit/twelveHourTestMonitor.test.ts tests/unit/newsApiRateLimit.test.ts tests/unit/phase12Stability.test.ts
```

| ファイル | テスト数 | 結果 |
|----------|----------|------|
| `twelveHourTestMonitor.test.ts` | 6 | **PASS** |
| `newsApiRateLimit.test.ts` | 2 | **PASS** |
| `phase12Stability.test.ts` | 5 | **PASS** |
| **合計** | **13** | **13/13 PASS** |

### 10.2 commit 前の推奨実行コマンド

```bash
npm run test:unit -- tests/unit/twelveHourTestMonitor.test.ts tests/unit/newsApiRateLimit.test.ts tests/unit/phase12Stability.test.ts
```

### 10.3 追加テスト（任意 — 今回は不要と判断）

| 候補 | 理由 |
|------|------|
| Settings / Context 統合テスト | RN モック成本高。コアは `twelveHourTestMonitor.test.ts` でカバー済み |
| `deviceLiveApiAudit` 単体 | ネットワーク / SecureStore 依存。Phase12 stability で API 失敗 graceful を確認済み |

---

## 11. 残存 ` D` 2 件を含めない確認

`git add` 案（§13）に以下は **含まれていない**:

- `scripts/capture-daily-comment-verify-screenshot.mjs`
- `scripts/kill-metro.ps1`

**PASS**

---

## 12. commit 可否

| 観点 | 判定 | コメント |
|------|------|----------|
| 候補 24 件の存在・整合 | **PASS** | 全件 dirty tree に存在 |
| シークレット | **PASS** | 実キーなし |
| unit test | **PASS** | 13/13 |
| 24 件内部依存 | **PASS** | グラフ閉じ |
| isolated typecheck（24 のみ） | **FAIL** | `newsApiEverythingTest.ts` 同梱推奨 |
| package.json script 完全性 | **部分 FAIL** | `device-live-api-audit.mjs` 同梱推奨 |
| 除外遵守 | **PASS** | D 2 件・forward-validation 等は含めない |
| **総合 commit 準備** | **CONDITIONAL PASS** | §6.3 ギャップ解消後に commit 実行が安全 |

### 推奨アクション（commit 実行前）

1. **必須推奨**: `src/services/newsApiEverythingTest.ts` を add 対象に追加（isolated typecheck 対策）
2. **強く推奨**: `scripts/device-live-api-audit.mjs` を add 対象に追加（npm script 整合）
3. **任意**: ランタイム完全配線（`ProductionStabilityContext` 等）は Commit 8 以降

---

## 13. 次に実行する `git add` コマンド案（未実行）

> **注意**: 以下は案のみ。ユーザー承認後に実行。`git add .` は使用しない。

### 13.1 ユーザー指定 24 件のみ

```bash
git add \
  src/context/BursaMaterialContext.tsx \
  src/context/ProactiveConciergeContext.tsx \
  src/screens/SettingsScreen.tsx \
  src/constants/storageKeys.ts \
  src/services/twelveHourTestMonitor.ts \
  src/services/twelveHourTestMonitorCore.ts \
  src/services/twelveHourTestMonitorPersistence.ts \
  src/types/twelveHourTestMonitor.ts \
  src/constants/twelveHourTestMonitor.ts \
  src/hooks/useTwelveHourTestRuntime.ts \
  src/services/deviceLiveApiAudit.ts \
  src/constants/deviceLiveApiAudit.ts \
  src/constants/newsApiRateLimit.ts \
  src/components/BursaDataErrorBoundary.tsx \
  tests/unit/twelveHourTestMonitor.test.ts \
  tests/unit/newsApiRateLimit.test.ts \
  tests/unit/phase12Stability.test.ts \
  package.json \
  scripts/twelve-hour-test-preflight-verify.ts \
  scripts/twelve-hour-api-key-audit.mjs \
  scripts/verify-material-fallback-without-newsapi.ts \
  scripts/newsapi-429-diagnosis.mjs \
  scripts/git-safe-sync-after-report.mjs \
  scripts/phase12-stability-test.mjs
```

### 13.2 推奨追加（§12 ギャップ解消 — 別承認）

```bash
git add src/services/newsApiEverythingTest.ts
git add scripts/device-live-api-audit.mjs
```

### 13.3 含めてはいけないもの（再確認）

```
scripts/capture-daily-comment-verify-screenshot.mjs   # D 状態
scripts/kill-metro.ps1                                # D 状態
scripts/forward-validation-*                          # 232 件
docs/review/PHASE13_*                                 # 監査 docs
src/navigation/MainTabNavigator.tsx                   # Twelve-Hour 外
.env                                                  # 絶対禁止
```

---

## 14. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `1254701` | **PASS** |
| remote `0 0` | **PASS** |
| 候補 24 件一覧・役割 | **PASS** |
| package.json scripts 確認 | **部分**（§5） |
| 依存関係分析 | **PASS**（ギャップ文書化済み） |
| 除外一覧 | **PASS** |
| D 2 件除外 | **PASS** |
| シークレットスキャン | **PASS** |
| typecheck 予想 | **CONDITIONAL**（isolated FAIL / worktree PASS） |
| unit test | **PASS** |
| git add / commit / push 未実施 | **PASS** |
| **総合（Commit 7 準備）** | **CONDITIONAL PASS** |

---

## 15. 停止宣言

Commit 7 準備レポート完了。`git add` / `commit` / `push` は **一切実行していない**。

---

*Evidence: `git rev-parse HEAD`, `git rev-list --left-right --count`, `git status --porcelain`, `git diff HEAD` on 4 modified src files, `npx tsc --noEmit`（Commit 7 パスフィルタ 0 エラー）, `npx vitest run` 13/13 PASS, シークレットスキャン（24 ファイル）*
