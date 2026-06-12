# Phase13–16 Commit 1 準備レポート

監査日: 2026-06-02  
対象コミット: **Commit 1** — `phase13-16: earnings call through institutional intelligence`  
前提: `PHASE13_23_COMMIT_STRATEGY_REPORT.md` 方針承認済み  
実施範囲: **準備のみ**（`git add` / `commit` / `push` は未実施）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| `44f1a2b` push 未実施の再確認 | **確認済み**（remote は `338ebc4` のまま） |
| Commit 1 候補ファイル数 | **63** |
| Phase13–16 実行コード依存 | **完結**（既存 base + 候補 shared で充足） |
| 隔離 typecheck 予想 | **条件付き FAIL**（`bursaDisclosure.ts` 全量投入時） |
| Commit 1 準備 | **PASS** |
| 隔離 typecheck（現状ファイルそのまま） | **FAIL** |
| 総合判定 | **PASS（条件付き）** — 実行前に disclosure 分割が必須 |

---

## 1. `44f1a2b` push 未実施の再確認

| 項目 | 値 |
|------|-----|
| ローカル HEAD | `44f1a2b` — `phase23: add earnings revision intelligence and pipeline wiring` |
| remote `origin/cursor/top3-maxdd-capital-audit` | `338ebc4` — `Phase12.5: add runner-console.txt` |
| `git rev-list --left-right --count origin...HEAD` | `0 1`（ローカルのみ 1 コミット先行） |
| push 状態 | **`44f1a2b` は push されていない** |

**結論**: 承認方針どおり、`44f1a2b` をそのまま push しない状態が維持されている。

---

## 2. Commit 1 ファイル候補一覧（63 件）

### 2.1 Phase13（16 件）

| # | パス |
|---|------|
| 1 | `docs/review/PHASE13_17_DATA_SOURCE_PLAN.md` |
| 2 | `docs/review/PHASE13_EARNINGS_CALL_REPORT.md` |
| 3 | `docs/review/phase13-earnings-call/verify-results.json` |
| 4 | `scripts/bursa-phase13-klse-diagnose.ts` |
| 5 | `scripts/bursa-phase13-verify.ts` |
| 6 | `scripts/klse-financial-report-1155-2024-12-31.html` |
| 7 | `scripts/klse-probe-s-www-klsescreener-com-v2-financial-reports-aisummary-740579.html` |
| 8 | `scripts/probe-klse-financial-report.ts` |
| 9 | `src/services/bursa/bursaEarningsCallService.ts` |
| 10 | `src/services/bursa/bursaFinancialReportAnalysis.ts` |
| 11 | `src/services/bursa/bursaPhase13Analysis.ts` |
| 12 | `src/services/bursa/earningsCallAiSummary.ts` |
| 13 | `src/types/bursaEarningsCall.ts` |
| 14 | `src/types/bursaFinancialReportAnalysis.ts` |
| 15 | `tests/unit/bursaFinancialReportAnalysis.test.ts` |
| 16 | `tests/unit/bursaPhase13.test.ts` |

### 2.2 Phase14（7 件）

| # | パス |
|---|------|
| 17 | `docs/review/PHASE14_ANALYST_CONSENSUS_REPORT.md` |
| 18 | `docs/review/phase14-analyst-consensus/verify-results.json` |
| 19 | `src/services/bursa/bursaAnalystConsensusProviders.ts` |
| 20 | `src/services/bursa/bursaAnalystConsensusService.ts` |
| 21 | `src/services/bursa/bursaPhase14Analysis.ts` |
| 22 | `src/types/bursaAnalystConsensus.ts` |
| 23 | `tests/unit/bursaPhase14.test.ts` |

### 2.3 Phase15（7 件）

| # | パス |
|---|------|
| 24 | `docs/review/PHASE15_INSIDER_TRADING_REPORT.md` |
| 25 | `docs/review/phase15-insider-trading/verify-results.json` |
| 26 | `src/services/bursa/bursaInsiderTradingParser.ts` |
| 27 | `src/services/bursa/bursaInsiderTradingService.ts` |
| 28 | `src/services/bursa/bursaPhase15Analysis.ts` |
| 29 | `src/types/bursaInsiderTrading.ts` |
| 30 | `tests/unit/bursaPhase15.test.ts` |

### 2.4 Phase16 / 16.5 / 16.6 / 16.7 / 16.8 コード（25 件 + テスト fixture 1 件）

| # | パス | 備考 |
|---|------|------|
| 31 | `docs/review/PHASE16_5_INSTITUTIONAL_TREND_REPORT.md` | 16.5 |
| 32 | `docs/review/PHASE16_6_HISTORICAL_OWNERSHIP_REPORT.md` | 16.6 |
| 33 | `docs/review/PHASE16_7_FIXED_BASKET_REPORT.md` | 16.7 |
| 34 | `docs/review/PHASE16_INSTITUTIONAL_OWNERSHIP_REPORT.md` | 16 |
| 35 | `scripts/klse-shareholdings-1155.html` | fixture |
| 36 | `scripts/klse-shareholdings.html` | fixture |
| 37 | `scripts/probe-shareholdings-1155.ts` | probe |
| 38 | `src/services/bursa/bursaFixedInstitutionalBasketService.ts` | 16.7 / 16.8 TOP30 |
| 39 | `src/services/bursa/bursaHistoricalOwnershipService.ts` | 16.6 |
| 40 | `src/services/bursa/bursaInstitutionalOwnershipParser.ts` | 16 / 16.8 |
| 41 | `src/services/bursa/bursaInstitutionalOwnershipService.ts` | 16 |
| 42 | `src/services/bursa/bursaInstitutionalTrendParser.ts` | 16.5 |
| 43 | `src/services/bursa/bursaInstitutionalTrendService.ts` | 16.5 |
| 44 | `src/services/bursa/bursaPhase16Analysis.ts` | 16 |
| 45 | `src/services/bursa/bursaPhase16BasketAnalysis.ts` | 16.7 |
| 46 | `src/services/bursa/bursaPhase16HistoricalAnalysis.ts` | 16.6 |
| 47 | `src/services/bursa/bursaPhase16TrendAnalysis.ts` | 16.5 |
| 48 | `src/types/bursaFixedInstitutionalBasket.ts` | 16.7 / 16.8 |
| 49 | `src/types/bursaHistoricalOwnership.ts` | 16.6 |
| 50 | `src/types/bursaInstitutionalOwnership.ts` | 16 |
| 51 | `src/types/bursaInstitutionalTrend.ts` | 16.5 |
| 52 | `tests/unit/bursaPhase16.test.ts` | |
| 53 | `tests/unit/bursaPhase16Basket.test.ts` | |
| 54 | `tests/unit/bursaPhase16Historical.test.ts` | |
| 55 | `tests/unit/bursaPhase16Trend.test.ts` | |
| 56 | `scripts/klse-sample-1155.html` | **追加候補** — Phase15–16 unit test fixture（classify 漏れ） |

> **Phase16.8**: 専用 Phase バケットはない。TOP30 basket ロジックは Phase16 コード内（`bursaInstitutionalOwnershipParser.ts`, `bursaFixedInstitutionalBasket.ts`）に含まれる。Phase16.8 監査 doc/script は Phase17 クロスオーバーとして **除外**（§4 参照）。

### 2.5 Shared（最小 — 型・normalize・Phase13–16 実行依存）（7 件）

| # | パス | 理由 |
|---|------|------|
| 57 | `src/types/bursaDisclosure.ts` | Phase13–16 型フィールド + `scoreJa` / `detailJa`（**Phase17+ 行は分割必須**） |
| 58 | `src/services/bursa/bursaMaterialSentiment.ts` | Phase13–16 全オーケストレータが import |
| 59 | `src/services/bursa/bursaMaterialWeightCalibration.ts` | Phase16.5 trend スコア調整 |
| 60 | `tests/unit/bursaMaterialWeightCalibration.test.ts` | 上記テスト |
| 61 | `src/services/quoteProviders/yahooQuoteSummaryClient.ts` | Phase14 Analyst Consensus プロバイダ依存 |
| 62 | `src/services/bursa/bursaPayloadNormalize.ts` | disclosure normalize 基盤（新規 untracked） |
| 63 | `tests/unit/bursaPayloadNormalize.test.ts` | 上記テスト |

### 2.6 内訳

| 区分 | 件数 |
|------|------|
| src | 28 |
| tests | 11 |
| scripts | 11 |
| docs | 13 |
| **合計** | **63** |

---

## 3. 依存関係

### 3.1 Phase13–16 パイプライン順

```
Phase13 (Earnings Call)
  → Phase14 (Analyst Consensus)
    → Phase15 (Insider Trading)
      → Phase16 (Institutional Ownership)
        → Phase16.5 (Institutional Trend)
        → Phase16.6 (Historical Ownership)
        → Phase16.7 / 16.8 (Fixed / TOP30 Basket)
```

### 3.2 Commit 1 内の直接 import 依存（オーケストレータ）

| ファイル | 必須 shared / 基盤 |
|----------|-------------------|
| `bursaPhase13Analysis.ts` | `bursaDisclosure`, `bursaMaterialSentiment`, `bursaEarningsCallService` |
| `bursaPhase14Analysis.ts` | 同上 + `bursaAnalystConsensusService` |
| `bursaPhase15Analysis.ts` | 同上 + `bursaInsiderTradingService` |
| `bursaPhase16Analysis.ts` | 同上 + `bursaInstitutionalOwnershipService` |
| `bursaPhase16TrendAnalysis.ts` | 同上 + `bursaMaterialWeightCalibration`（via trend service） |
| `bursaPhase16HistoricalAnalysis.ts` | 同上 + `bursaHistoricalOwnershipService` |
| `bursaPhase16BasketAnalysis.ts` | 同上 + `bursaFixedInstitutionalBasketService` |
| `bursaAnalystConsensusProviders.ts` | `yahooQuoteSummaryClient`, `providerFetchUtil`（**base `338ebc4` 既存**） |
| Phase16 KLSE 系 | `bursaKlseHtmlClient`, `bursaKlseParser`（**base 既存**） |

### 3.3 依存完結性の判定

| 観点 | 結果 |
|------|------|
| Phase13–16 **実行コード**が Phase17+ を import するか | **なし** |
| Phase13–16 が Commit 5 配線（Phase11 / UI）を要求するか | **なし**（単体オーケストレータは独立） |
| base `338ebc4` 上の既存インフラで足りるか | **はい**（KLSE parser, announcement, shareholders, `providerFetchUtil` 等） |
| テスト fixture | `klse-sample-1155.html` を候補に追加すれば Phase15–16 test は充足 |

**結論**: Phase13–16 の**実行ロジック**は Commit 1 候補 + base で依存完結する。

### 3.4 唯一の隔離ブロッカー: `bursaDisclosure.ts`

現行ワーキングツリー上の `bursaDisclosure.ts` は Phase13–16 フィールドに加え、以下の **Phase17–23 向け optional プロパティ**（計 10 ブロック）を含む:

```
dividendIntelligence      → bursaDividendIntelligence.ts        (Phase17)
newsIntelligence          → bursaNewsIntelligence.ts            (Phase18)
macroIntelligence         → bursaMacroIntelligence.ts           (Phase19)
sectorRotation            → bursaSectorRotation.ts              (Phase19.5)
valuationIntelligence     → bursaValuationIntelligence.ts       (Phase20)
fairValueIntelligence     → bursaFairValueIntelligence.ts       (Phase21)
analystTargetIntelligence → bursaAnalystTargetIntelligence.ts   (Phase22)
valuationGapIntelligence  → bursaValuationGapIntelligence.ts    (Phase22.1)
convictionIntelligence    → bursaConvictionIntelligence.ts      (Phase22.2)
earningsRevisionIntelligence → bursaEarningsRevisionIntelligence.ts (Phase23)
```

Commit 1 だけを checkout した状態で **全量 `bursaDisclosure.ts` を含めると**、上記 type ファイル不在により **typecheck FAIL** となる（Phase23 push readiness 調査と同型）。

**必須対策（Commit 1 実行前）**:

- `bursaDisclosure.ts` は **Phase13–16 フィールド + `BursaMaterialItem.scoreJa/detailJa` のみ**を Commit 1 に含める
- Phase17+ optional プロパティは Commit 2 以降で段階追加
- 実装手段: `git add -p src/types/bursaDisclosure.ts` または事前にファイル分割

---

## 4. 除外ファイル一覧

### 4.1 ユーザー禁止カテゴリ（Commit 1 に含めない）

| カテゴリ | 例 |
|----------|-----|
| Phase17 以降 | §4.2 全件 |
| `docs/review/phase12-5-long-run/**` | checkpoint.json, *.xml, *.png, logcat 等 |
| `*.png` / `*.jpg` / `*.log` | 全 working tree から除外 |
| `openai-*.json` | `scripts/openai-*.json` 等 |
| device verify 成果物 | `scripts/ai-enhanced-analysis-device-verify/**`, `scripts/api-key-device-verify/**`, `docs/review/*-device/**` 等 |

### 4.2 Phase17 以降（classify-v2 ベース — Commit 1 対象外）

**Phase17（10）**

- `docs/review/PHASE16_7_PHASE17_AUDIT_REPORT.md`
- `docs/review/PHASE16_8_PHASE17_5_AUDIT_REPORT.md` ← Phase16.8 監査 doc（Phase17 クロス）
- `docs/review/PHASE17_DIVIDEND_INTELLIGENCE_REPORT.md`
- `scripts/bursa-phase16-7-phase17-audit-verify.ts`
- `scripts/bursa-phase16-8-phase17-5-audit-verify.ts`
- `src/services/bursa/bursaDividendIntelligenceProviders.ts`
- `src/services/bursa/bursaDividendIntelligenceService.ts`
- `src/services/bursa/bursaPhase17Analysis.ts`
- `src/types/bursaDividendIntelligence.ts`
- `tests/unit/bursaPhase17.test.ts`

**Phase18（22）** — `bursaPhase18*`, `bursaNews*`, `PHASE18_*` 全件

**Phase19（12）** — macro 基盤（未コミット分 6 + 既存 6）

**Phase19.5（7）** — sector rotation 全件

**Phase20（12）** — valuation 全件

**Phase21（20）** — fair value 全件

**Phase21.8（3）** — DDM correction

**Phase22（7）** — analyst target

**Phase22.1（7）** — valuation gap

**Phase22.2（7）** — conviction（`44f1a2b` 内 4 件含む）

**Phase23（22）** — earnings revision（`44f1a2b` 内 7 件含む）

### 4.3 Shared — Commit 5 へ延期（Commit 1 に含めない）

| パス | 理由 |
|------|------|
| `src/services/bursa/bursaPhase11Analysis.ts` | Phase17+ 全フェーズ配線 |
| `src/services/bursa/bursaMaterialAnalysisService.ts` | フルパイプライン |
| `src/screens/MaterialAnalysisScreen.tsx` | UI（Phase23 表示含む） |
| `src/services/buildConciergeEnhancedAnalysis.ts` | Concierge 配線 |
| `src/types/conciergeEnhancedAnalysis.ts` | 同上 |
| `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx` | 同上 |
| `src/context/BursaConciergeContext.tsx` | 同上 |
| `src/components/BursaConciergeHomeCard.tsx` | Concierge |
| `src/services/bursa/bursaConciergeNotification*.ts` | Concierge |
| `src/services/bursa/bursaAnalysisDiagnostics.ts` | 横断診断 |
| `tests/unit/bursaPhase11.test.ts` | Phase11 配線テスト |
| `tests/unit/buildConciergeEnhancedAnalysis.test.ts` | Concierge テスト |

### 4.4 `44f1a2b` 内だが Commit 1 対象外（soft reset 後に後続コミットへ）

```
scripts/bursa-phase23-audit-verify.ts
src/constants/bursaConvictionIntelligence.ts
src/constants/bursaEarningsRevisionIntelligence.ts
src/services/bursa/bursaConvictionIntelligenceService.ts
src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts
src/services/bursa/bursaEarningsRevisionIntelligenceService.ts
src/services/bursa/bursaPhase22_2Analysis.ts
src/services/bursa/bursaPhase23Analysis.ts
src/types/bursaConvictionIntelligence.ts
src/types/bursaEarningsRevisionIntelligence.ts
tests/unit/bursaPhase23.test.ts
(+ UI/Concierge/MaterialAnalysis 等 — Commit 5)
```

### 4.5 その他除外（テスト fixture 過剰）

| パス | 理由 |
|------|------|
| `scripts/klse-sample-1066.html` | Commit 1 test 未使用 |
| `scripts/klse-sample-5183.html` | 同上 |
| `scripts/klse-sample-5819.html` | 同上 |

### 4.6 `bursaDisclosure.ts` 内の除外（ファイル分割）

| 行付近 | 内容 | 投入先 |
|--------|------|--------|
| L759–778 | Phase17–23 optional プロパティ | Commit 2–5 |

---

## 5. typecheck 予想

| シナリオ | 予想 | 根拠 |
|----------|------|------|
| **A. 候補 63 件 + `bursaDisclosure.ts` 全量** | **FAIL** | Phase17+ type モジュール不在（10 import） |
| **B. 候補 63 件 + disclosure Phase13–16 スライスのみ** | **PASS（高確度）** | 現ローカル full tree で Phase13–16 + shared は compile 可能。base インフラは `338ebc4` 既存 |
| **C. Commit 1 後に Phase13–16 unit test のみ** | **PASS（高確度）** | シナリオ B 前提 |

**推奨ゲート（Commit 1 直後）**:

```bash
npm run typecheck
npx vitest run tests/unit/bursaPhase13.test.ts tests/unit/bursaPhase14.test.ts \
  tests/unit/bursaPhase15.test.ts tests/unit/bursaPhase16*.test.ts \
  tests/unit/bursaFinancialReportAnalysis.test.ts \
  tests/unit/bursaMaterialWeightCalibration.test.ts \
  tests/unit/bursaPayloadNormalize.test.ts
```

---

## 6. commit 可否

| 判定項目 | 結果 |
|----------|------|
| ファイル候補の確定 | **可** |
| 依存関係（Phase13–16 実行コード） | **完結** |
| 禁止ファイル混入 | **なし**（候補リスト確認済み） |
| 隔離 typecheck | **不可**（disclosure 全量の場合）→ **disclosure 分割後は可** |
| 現時点での `git commit` 実行 | **禁止**（本タスク指示） |

**commit 可否**: **準備 PASS — 実行は `git reset --soft 338ebc4` + disclosure 分割後に Proceed 可**

---

## 7. 次に実行する `git add` コマンド案

> **注意**: 以下は案のみ。本レポート時点では **未実行**。

### 7.1 前提（ユーザー承認後）

```bash
# 44f1a2b を解消し、338ebc4 上に変更を戻す
git reset --soft 338ebc4
```

### 7.2 Commit 1 一括 add（disclosure 分割済みを前提）

```bash
git add \
  docs/review/PHASE13_17_DATA_SOURCE_PLAN.md \
  docs/review/PHASE13_EARNINGS_CALL_REPORT.md \
  docs/review/phase13-earnings-call/verify-results.json \
  docs/review/PHASE14_ANALYST_CONSENSUS_REPORT.md \
  docs/review/phase14-analyst-consensus/verify-results.json \
  docs/review/PHASE15_INSIDER_TRADING_REPORT.md \
  docs/review/phase15-insider-trading/verify-results.json \
  docs/review/PHASE16_5_INSTITUTIONAL_TREND_REPORT.md \
  docs/review/PHASE16_6_HISTORICAL_OWNERSHIP_REPORT.md \
  docs/review/PHASE16_7_FIXED_BASKET_REPORT.md \
  docs/review/PHASE16_INSTITUTIONAL_OWNERSHIP_REPORT.md \
  scripts/bursa-phase13-klse-diagnose.ts \
  scripts/bursa-phase13-verify.ts \
  scripts/klse-financial-report-1155-2024-12-31.html \
  scripts/klse-probe-s-www-klsescreener-com-v2-financial-reports-aisummary-740579.html \
  scripts/klse-shareholdings-1155.html \
  scripts/klse-shareholdings.html \
  scripts/klse-sample-1155.html \
  scripts/probe-klse-financial-report.ts \
  scripts/probe-shareholdings-1155.ts \
  src/services/bursa/bursaAnalystConsensusProviders.ts \
  src/services/bursa/bursaAnalystConsensusService.ts \
  src/services/bursa/bursaEarningsCallService.ts \
  src/services/bursa/bursaFinancialReportAnalysis.ts \
  src/services/bursa/bursaFixedInstitutionalBasketService.ts \
  src/services/bursa/bursaHistoricalOwnershipService.ts \
  src/services/bursa/bursaInsiderTradingParser.ts \
  src/services/bursa/bursaInsiderTradingService.ts \
  src/services/bursa/bursaInstitutionalOwnershipParser.ts \
  src/services/bursa/bursaInstitutionalOwnershipService.ts \
  src/services/bursa/bursaInstitutionalTrendParser.ts \
  src/services/bursa/bursaInstitutionalTrendService.ts \
  src/services/bursa/bursaMaterialSentiment.ts \
  src/services/bursa/bursaMaterialWeightCalibration.ts \
  src/services/bursa/bursaPayloadNormalize.ts \
  src/services/bursa/bursaPhase13Analysis.ts \
  src/services/bursa/bursaPhase14Analysis.ts \
  src/services/bursa/bursaPhase15Analysis.ts \
  src/services/bursa/bursaPhase16Analysis.ts \
  src/services/bursa/bursaPhase16BasketAnalysis.ts \
  src/services/bursa/bursaPhase16HistoricalAnalysis.ts \
  src/services/bursa/bursaPhase16TrendAnalysis.ts \
  src/services/bursa/earningsCallAiSummary.ts \
  src/services/quoteProviders/yahooQuoteSummaryClient.ts \
  src/types/bursaAnalystConsensus.ts \
  src/types/bursaDisclosure.ts \
  src/types/bursaEarningsCall.ts \
  src/types/bursaFinancialReportAnalysis.ts \
  src/types/bursaFixedInstitutionalBasket.ts \
  src/types/bursaHistoricalOwnership.ts \
  src/types/bursaInsiderTrading.ts \
  src/types/bursaInstitutionalOwnership.ts \
  src/types/bursaInstitutionalTrend.ts \
  tests/unit/bursaFinancialReportAnalysis.test.ts \
  tests/unit/bursaMaterialWeightCalibration.test.ts \
  tests/unit/bursaPayloadNormalize.test.ts \
  tests/unit/bursaPhase13.test.ts \
  tests/unit/bursaPhase14.test.ts \
  tests/unit/bursaPhase15.test.ts \
  tests/unit/bursaPhase16.test.ts \
  tests/unit/bursaPhase16Basket.test.ts \
  tests/unit/bursaPhase16Historical.test.ts \
  tests/unit/bursaPhase16Trend.test.ts
```

### 7.3 disclosure 分割（推奨 — 全量 add の代替）

```bash
# Phase13–16 フィールド + scoreJa/detailJa のみ stage
git add -p src/types/bursaDisclosure.ts
# → Phase17 以降の optional プロパティ hunks は 'n'（skip）
```

---

## 8. PASS / FAIL

| チェック | 判定 |
|----------|------|
| `44f1a2b` 未 push 確認 | **PASS** |
| Commit 1 候補一覧作成 | **PASS**（63 件） |
| 除外一覧作成 | **PASS** |
| Phase13–16 実行依存完結 | **PASS** |
| `git add` 未実施 | **PASS** |
| 隔離 typecheck（disclosure 全量） | **FAIL** |
| 隔離 typecheck（disclosure 分割後） | **PASS（予想）** |
| **総合（Commit 1 準備）** | **PASS（条件付き）** |

---

## 9. 停止宣言

本レポート作成をもって **Commit 1 準備タスクは完了**。  
`git add` / `git commit` / `git push` / `git reset` は **一切実行していない**。

次ステップ（ユーザー承認後）:

1. `git reset --soft 338ebc4`
2. `bursaDisclosure.ts` Phase13–16 スライスのみ stage（§7.3）
3. §7.2 の `git add` 実行
4. `npm run typecheck` + Phase13–16 unit tests
5. `git commit -m "phase13-16: earnings call through institutional intelligence"`

---

*Evidence: `docs/review/evidence/phase13-23-classify-v2.json`, remote `338ebc4` vs HEAD `44f1a2b` (`0 1`)*
