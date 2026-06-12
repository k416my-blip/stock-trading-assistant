# Phase22 Analyst Target Intelligence 監査レポート

## 1. 実施日時
2026-06-11T02:31:48.218Z

## 2. Commit Hash
338ebc4

## 3. 実装ファイル
- `src/types/bursaAnalystTargetIntelligence.ts`
- `src/constants/bursaAnalystTargetIntelligence.ts`
- `src/services/bursa/bursaAnalystTargetIntelligenceProviders.ts`
- `src/services/bursa/bursaAnalystTargetIntelligenceService.ts`
- `src/services/bursa/bursaPhase22Analysis.ts`
- `src/services/bursa/bursaPhase11Analysis.ts`
- `src/services/bursa/bursaMaterialAnalysisService.ts`
- `src/screens/MaterialAnalysisScreen.tsx`
- `src/types/bursaDisclosure.ts`
- `src/types/conciergeEnhancedAnalysis.ts`
- `src/services/buildConciergeEnhancedAnalysis.ts`
- `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx`
- `tests/unit/bursaPhase22.test.ts`
- `scripts/bursa-phase22-audit-verify.ts`

## 4. 取得率
- 成功銘柄: **6/6**
- 平均取得率: **100%**
- データ優先順位: Yahoo Finance → Analyst Consensus（Phase14）→ 未取得（推測禁止）

## 5. 6銘柄ライブ結果

| 銘柄 | 名称 | Target Median | Bull | Bear | Coverage | Upside | Trend | Source | 状態 |
|------|------|---------------|------|------|----------|--------|-------|--------|------|
| 1155 | Maybank | RM 11.90 | RM 15.00 | RM 10.90 | 19 | +11.6% | Stable（横ばい） | yahoo_finance | 成功 |
| 1023 | CIMB | RM 9.05 | RM 10.30 | RM 8.00 | 20 | +23.1% | Stable（横ばい） | yahoo_finance | 成功 |
| 1295 | Public Bank | RM 5.45 | RM 6.60 | RM 4.50 | 19 | +13.8% | Stable（横ばい） | yahoo_finance | 成功 |
| 5347 | Tenaga | RM 16.50 | RM 18.15 | RM 14.18 | 21 | +15.9% | Stable（横ばい） | yahoo_finance | 成功 |
| 4707 | Nestle | RM 113.00 | RM 135.00 | RM 91.80 | 12 | +21.0% | Stable（横ばい） | yahoo_finance | 成功 |
| 6033 | Petronas Gas | RM 18.80 | RM 19.80 | RM 17.80 | 13 | +9.2% | Stable（横ばい） | yahoo_finance | 成功 |

## 6. Analyst Score

| 銘柄 | Analyst Score | 材料スコア変化 | Analyst Adj |
|------|---------------|----------------|-------------|
| 1155 | +4 | 57 → 57 (+0) | +2 |
| 1023 | +7 | 57 → 71 (+14) | +4 |
| 1295 | +4 | 57 → 37 (-20) | +2 |
| 5347 | +4 | 42 → 92 (+50) | +2 |
| 4707 | +5 | 30 → -13 (-43) | +3 |
| 6033 | +0 | 45 → 13 (-32) | +0 |

## 7. Fair Value 比較

| 銘柄 | Fair Value | Analyst Target | 差 | 判定 |
|------|------------|----------------|-----|------|
| 1155 | RM 10.20 | RM 11.90 | +16.7% | Analyst Bullish（アナリスト上方） |
| 1023 | RM 7.92 | RM 9.05 | +14.3% | Analyst Bullish（アナリスト上方） |
| 1295 | RM 4.07 | RM 5.45 | +33.9% | Analyst Bullish（アナリスト上方） |
| 5347 | RM 20.94 | RM 16.50 | -21.2% | Fair Value Bullish（モデル上方） |
| 4707 | RM 65.90 | RM 113.00 | +71.5% | Analyst Bullish（アナリスト上方） |
| 6033 | RM 10.59 | RM 18.80 | +77.5% | Analyst Bullish（アナリスト上方） |

## 8. PASS/FAIL
**PASS** — 6銘柄中 6 銘柄で Analyst Target 取得成功（閾値: 6/6）

## 9. 残課題
- Bear/Bull は Yahoo Finance 依存のため、Yahoo 未提供時は Analyst Consensus フォールバックでは Mean/Median のみ
- Target Revision Trend は recommendationTrend 2期比較（Yahoo）または Phase14 consensusTrend マッピング
- Reduce/Sell は Yahoo strongSell→Sell, sell→Reduce にマッピング（海外API慣行）

## 10. 次の推奨Phase
- **Phase22.1** — Valuation Gap Intelligence（Fair Value + Analyst Target 統合判定・単一材料項目化）
- **Phase23** — Earnings Revision × Analyst Target クロスシグナル（上方修正×目標株価上昇の複合スコア）

## エラー詳細
- なし