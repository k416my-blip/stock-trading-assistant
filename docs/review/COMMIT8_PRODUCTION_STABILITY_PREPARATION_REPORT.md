# Commit 8 準備レポート — Production Stability / Runtime 配線

監査日: 2026-06-02  
前提: Commit 1〜7 は GitHub push 済み（HEAD = `0575638`）  
実施範囲: **候補特定・精査のみ**（`git add` / `commit` / `push` は **未実施**）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD | `057563887a9c50438430e2d3388ea3153aca1713` — **PASS** |
| remote 同期 | `0	0` — **PASS** |
| 未コミット合計 | **460 件**（M 23 / ?? 435 / D 2） |
| **Commit 8 コア候補** | **8 件**（+111 / −10 行） |
| **推奨同梱（Bursa 画面エラー統一）** | **3 件**（+6 / −3 行） |
| 新規 untracked（src/tests） | **0 件** |
| コア 8 件の依存完結 | **PASS**（Commit 7 モジュールに依存） |
| シークレットスキャン（コア 8 件） | **PASS** |
| typecheck（現行 worktree） | **PASS** |
| unit test（関連既存） | **11/11 PASS** |
| **commit 準備可否** | **CONDITIONAL PASS**（コア 8 件で commit 可。画面 3 件は同梱推奨） |
| **総合判定** | **PASS** |

---

## 1. HEAD 確認

```
057563887a9c50438430e2d3388ea3153aca1713
```

message: `twelve-hour-test-monitor: add runtime monitor and live API audit tooling`（Commit 7）

---

## 2. remote 同期確認

```bash
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
```

| 結果 | 期待値 | 判定 |
|------|--------|------|
| `0	0` | `0 0` | **PASS** |

---

## 3. `git status` 集計

```bash
git status --porcelain
```

| 区分 | 件数 |
|------|------|
| **合計** | **460** |
| modified (` M`) | 23 |
| untracked (`??`) | 435 |
| deleted (` D`) | 2 |

### 3.1 `src/` modified 内訳（20 件）

| カテゴリ | 件数 | 判定 |
|----------|------|------|
| **Commit 8 コア** | 8 | §4 |
| **推奨同梱** | 3 | Bursa 画面 `mapBursaAnalysisError` |
| **対象外（Bursa 分析・監視）** | 9 | `bursa*` サービス微修正 |
| untracked `src/` / `tests/` | **0** | Commit 8 に新規ファイル不要 |

### 3.2 その他 dirty（Commit 8 外）

| カテゴリ | 件数 |
|----------|------|
| `scripts/forward-validation-*` 等 | ~232 |
| `docs/review/**` | ~60+ |
| `scripts/` その他 untracked | ~100+ |
| `.cursorignore` 等 | 少数 |
| ` D` 2 件 | `capture-daily-comment-verify-screenshot.mjs`, `kill-metro.ps1` |

---

## 4. Commit 8 候補一覧

### 4.1 コア候補（8 件）— **必須**

| # | パス | 分類 | 差分 | 役割 |
|---|------|------|------|------|
| 1 | `src/context/ProductionStabilityContext.tsx` | A + C | +3 | `useTwelveHourTestRuntime()` 呼び出し |
| 2 | `src/services/productionStability/productionStabilityRuntime.ts` | A + C | +29 | 12h 監視自動起動 / device audit 自動実行 / Concierge AI pause 例外 |
| 3 | `src/services/performanceCostRuntime.ts` | A + C | +16 | 12h 中のバックグラウンド API bypass |
| 4 | `src/context/app/useAppApiKeys.ts` | C | +9 | 価格更新時 `noteTwelveHourPriceUpdate` |
| 5 | `src/services/aiStrategyService.ts` | C | +5 | AI 応答時 `noteTwelveHourAiResponse` |
| 6 | `src/navigation/MainTabNavigator.tsx` | B | +48 | `wrapBursaScreen` で Bursa タブ 5 画面をエラー境界化 |
| 7 | `src/components/AppErrorBoundary.tsx` | A | +4 | フォールバック文言を「データ取得エラー」に統一 |
| 8 | `src/utils/consoleLogFilter.ts` | A + C | +7 | `[12H-MONITOR]` / `[DEVICE-LIVE-AUDIT]` 等をログ許可 |

**コア合計: 8 ファイル / +111 −10 行**

### 4.2 推奨同梱（3 件）— **任意だが推奨**

`MainTabNavigator` の `wrapBursaScreen` と整合する Bursa 画面側エラー表示統一:

| # | パス | 差分 | 役割 |
|---|------|------|------|
| 9 | `src/screens/AssetManagementScreen.tsx` | +3 | `mapBursaAnalysisError('AssetManagement', ...)` |
| 10 | `src/screens/MarketMonitoringScreen.tsx` | +3 | 同上 `MarketMonitoring` |
| 11 | `src/screens/TodayTradingScreen.tsx` | +3 | 同上 `TodayTrading` |

> Commit 7 で `BursaMaterialContext` は既に `mapBursaAnalysisError` 適用済み。残 3 画面のみ未コミット。

### 4.3 同梱推奨サイズ

| パターン | 件数 |
|----------|------|
| **最小（コアのみ）** | **8** |
| **推奨（コア + 画面 3）** | **11** |

---

## 5. 分類詳細（A〜D）

### A. Production Stability 関連

| ファイル | Commit 8 | 備考 |
|----------|----------|------|
| `ProductionStabilityContext.tsx` | ✅ コア | |
| `productionStability/productionStabilityRuntime.ts` | ✅ コア | 他 `productionStability/*` は **clean** |
| `AppErrorBoundary.tsx` | ✅ コア | 文言改善 |
| `consoleLogFilter.ts` | ✅ コア | 監視ログ許可 |
| `performanceCostRuntime.ts` | ✅ コア | pause ロジック |

### B. MainTabNavigator 関連

| ファイル | Commit 8 | 備考 |
|----------|----------|------|
| `MainTabNavigator.tsx` | ✅ コア | `lazyBursaScreen` + 5 タブ wrap |

### C. Runtime 監視関連（Twelve-Hour / Device Audit 拡張）

Commit 7 でモジュール追加済み。Commit 8 は **配線のみ**:

```
initProductionStabilityRuntime()
  → startTwelveHourTestMonitor (EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1)
  → runDeviceLiveApiAudit (EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1)

ProductionStabilityProvider
  → useTwelveHourTestRuntime()  // 株価ポーリング継続

useAppApiKeys → noteTwelveHourPriceUpdate
aiStrategyService → noteTwelveHourAiResponse
performanceCostRuntime → isTwelveHourBackgroundOpsAllowed bypass
productionStabilityRuntime → shouldPauseConciergeAi bypass
```

### D. その他（Commit 8 対象外）

| ファイル | 理由 |
|----------|------|
| `src/services/bursa/*`（9 件） | Phase 分析・監視の独立改善。Runtime 配線と無関係 |
| `scripts/operational-api-test.mjs` | device verify スクリプト改変 |
| `scripts/verify-ai-enhanced-analysis-device.mjs` | 同上 |
| `forward-validation-*`（232） | US 戦略監査。別スコープ |
| `docs/review/**` | 監査 docs |
| ` D` 2 件 | 前回 B/D 整理残 |

---

## 6. 依存関係

### 6.1 コア 8 件の外部依存（すべて Commit 7 @ HEAD で充足）

| 依存先（Commit 7 push 済み） | 参照元（Commit 8） |
|------------------------------|-------------------|
| `hooks/useTwelveHourTestRuntime.ts` | `ProductionStabilityContext` |
| `services/twelveHourTestMonitor.ts` | `productionStabilityRuntime`, `performanceCostRuntime`, `useAppApiKeys`, `aiStrategyService` |
| `constants/twelveHourTestMonitor.ts` | `productionStabilityRuntime` |
| `services/deviceLiveApiAudit.ts` | `productionStabilityRuntime` |
| `constants/deviceLiveApiAudit.ts` | `productionStabilityRuntime` |
| `components/BursaDataErrorBoundary.tsx` | `MainTabNavigator` |

### 6.2 HEAD 既存依存（追加 commit 不要）

| 依存先 | 参照元 |
|--------|--------|
| `bursa*MISSING_JA` 定数群 | `MainTabNavigator` |
| `bursaAnalysisDiagnostics.mapBursaAnalysisError` | 推奨同梱 3 画面 |
| `portfolioPriceRefreshScheduler` | `useTwelveHourTestRuntime`（Commit 7） |

### 6.3 依存グラフ（コア 8 件は閉じている）

```
ProductionStabilityContext → useTwelveHourTestRuntime (C7)
productionStabilityRuntime → twelveHourTestMonitor, deviceLiveApiAudit (C7)
performanceCostRuntime → twelveHourTestMonitor (C7)
useAppApiKeys → twelveHourTestMonitor (C7)
aiStrategyService → twelveHourTestMonitor (C7)
MainTabNavigator → BursaDataErrorBoundary (C7) + bursa MISSING_JA (HEAD)
AppErrorBoundary → 自己完結
consoleLogFilter → 自己完結
```

**新規ファイル追加不要 — PASS**

### 6.4 逆依存（Commit 8 未適用時のギャップ — 現状）

| 機能 | Commit 7 のみ | Commit 8 適用後 |
|------|---------------|-----------------|
| 12h 監視自動起動 | ❌ 手動 / env のみ | ✅ `initProductionStabilityRuntime` |
| 12h 株価ポーリング hook | ❌ 未呼び出し | ✅ `ProductionStabilityContext` |
| Device audit 自動起動 | ❌ Settings 手動のみ | ✅ env=1 で 8s 後自動 |
| Bursa タブ crash 境界 | ❌ 未 wrap | ✅ 5 タブ |
| 価格 / AI note 計測 | ❌ 部分のみ（Material/Concierge は C7） | ✅ 全経路 |

---

## 7. 除外ファイル一覧

### 7.1 Commit 8 に含めないもの（明示）

| カテゴリ | 代表パス | dirty 件数 |
|----------|----------|-----------|
| Bursa 分析サービス | `src/services/bursa/bursaPhase6–8Analysis.ts` 等 9 件 | 9 |
| device verify scripts | `scripts/operational-api-test.mjs`, `verify-ai-enhanced-analysis-device.mjs` | 2 |
| forward-validation | `scripts/forward-validation-*.ts` | ~232 |
| 監査 docs | `docs/review/PHASE*`, `TWELVE_HOUR_*` 等 | 多数 |
| ` D` 残存 | `capture-daily-comment-verify-screenshot.mjs`, `kill-metro.ps1` | 2 |
| `.cursorignore` | IDE | 1 |

### 7.2 禁止カテゴリ混入チェック（Commit 8 候補 11 件）

| 禁止カテゴリ | コア 8 + 推奨 3 に含まれる | 判定 |
|--------------|---------------------------|------|
| `.env` | なし | **PASS** |
| `openai-*.json` | なし（候補外） | **PASS** |
| `*.png` / `*.jpg` / `*.log` | なし | **PASS** |
| `phase12-5-long-run/**` | なし | **PASS** |
| `ai-enhanced-analysis-device-verify/**` | なし | **PASS** |
| API キー / Bearer / secret 実体 | なし | **PASS** |

---

## 8. シークレットスキャン結果

対象: Commit 8 コア 8 ファイル全文

| パターン | ヒット |
|----------|--------|
| `sk-[20+ chars]` | **0** |
| `AIza[30+ chars]` | **0** |
| `Bearer ey...` | **0** |

動的 import のみ（`twelveHourTestMonitor`）。キー文字列の埋め込みなし。

**PASS**

---

## 9. typecheck 予想

### 9.1 現行 worktree（全 460 件 dirty 込み）

```bash
npm run typecheck
```

| 結果 | 判定 |
|------|------|
| **exit 0** | **PASS** |

### 9.2 isolated（Commit 8 コア 8 件のみ @ `0575638`）

| 予想 | 理由 |
|------|------|
| **PASS** | 依存はすべて Commit 7 + HEAD 既存型。新規型・import 追加なし |

> `forward-validation-*` の typecheck エラーは typecheck プロジェクト対象外のため Commit 8 に無関係。

---

## 10. unit test 対象

### 10.1 推奨実行（commit 前）

```bash
npx vitest run \
  tests/unit/productionStability.test.ts \
  tests/unit/performanceCost.test.ts \
  tests/unit/twelveHourTestMonitor.test.ts
```

### 10.2 準備時実行結果

| ファイル | テスト数 | 結果 |
|----------|----------|------|
| `productionStability.test.ts` | 5 | **PASS** |
| `performanceCost.test.ts` | 6 | **PASS** |
| **合計** | **11** | **11/11 PASS** |

### 10.3 追加テスト要否

| 項目 | 判断 |
|------|------|
| 新規 test ファイル | **不要**（既存で回帰カバー） |
| `shouldPauseApiRequests` + 12h bypass | 未テストだが既存 `performanceCost.test.ts` は関数存在確認済み。commit 後の改善候補 |

---

## 11. commit 可否

| 観点 | 判定 |
|------|------|
| コア 8 件の依存完結 | **PASS** |
| Commit 7 前提充足 | **PASS**（push 済み） |
| 新規 untracked 不要 | **PASS** |
| シークレット | **PASS** |
| typecheck | **PASS** |
| 関連 unit test | **PASS** |
| 禁止ファイル混入 | **PASS** |
| **commit 準備（コア 8 件）** | **PASS** |
| **推奨同梱（画面 3 件）** | **強く推奨**（MainTabNavigator とセットで UX 一貫） |

### 判定

| 選択 | 内容 |
|------|------|
| **最小** | コア 8 件のみ commit 可 |
| **推奨** | コア 8 + 画面 3 = **11 件** |

---

## 12. 推奨 commit message

### コア 8 件のみ

```
twelve-hour-runtime: wire production stability and bursa tab error boundaries
```

### 推奨 11 件（画面 3 同梱）

```
twelve-hour-runtime: wire stability monitor, device audit, and bursa error boundaries
```

---

## 13. 推奨 `git add` コマンド案（未実行）

### 13.1 コア 8 件

```bash
git add \
  src/context/ProductionStabilityContext.tsx \
  src/services/productionStability/productionStabilityRuntime.ts \
  src/services/performanceCostRuntime.ts \
  src/context/app/useAppApiKeys.ts \
  src/services/aiStrategyService.ts \
  src/navigation/MainTabNavigator.tsx \
  src/components/AppErrorBoundary.tsx \
  src/utils/consoleLogFilter.ts
```

### 13.2 推奨追加（画面 3 件）

```bash
git add \
  src/screens/AssetManagementScreen.tsx \
  src/screens/MarketMonitoringScreen.tsx \
  src/screens/TodayTradingScreen.tsx
```

---

## 14. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `0575638` | **PASS** |
| remote `0 0` | **PASS** |
| git status 集計 | **PASS** |
| Commit 8 候補特定 | **PASS** |
| 依存関係分析 | **PASS** |
| 除外一覧 | **PASS** |
| シークレットスキャン | **PASS** |
| typecheck 予想 | **PASS** |
| unit test 対象 | **PASS** |
| git add / commit / push 未実施 | **PASS** |
| **総合（Commit 8 準備）** | **PASS** |

---

## 15. 停止宣言

Commit 8 候補特定・準備レポート完了。`git add` / `commit` / `push` は **一切実行していない**。

---

*Evidence: `git status --porcelain`（460）, `git diff HEAD --stat` on 20 modified src files, `npm run typecheck`, `npx vitest run` 11/11, シークレットスキャン（コア 8 件）*
