# PHASE23_REVENUE_REVISION_IMPLEMENTATION_REPORT

## 概要
Phase23 Revenue Revision — Yahoo revenueTrend 欠落 (.KL) 向け FMP / Finnhub / Alpha Vantage / Estimate Snapshot カスケード。

- 実行日時: 2026-06-19T03:31:57.078Z
- Git commit: `fc0de08`
- Push: pending

## 実装サマリー

| 項目 | 内容 |
|------|------|
| 新規プロバイダ | `bursaRevenueRevisionProviders.ts` |
| スナップショット | `bursaRevenueRevisionSnapshotStore.ts`（30D revision 算出） |
| ソース拡張 | fmp / finnhub / alpha_vantage / estimate_snapshot |
| Phase23.1 | EPS Stable 時 Revenue Revision で bias 反映 |
| fetchedFields | `phase23.revenue_revision_series` |

## カスケードソース

| 優先 | ソース | 備考 |
|------|--------|------|
| 1 | Yahoo earningsTrend revenueTrend | .KL 銘柄は多く revenueTrend 欠落 |
| 2 | FMP analyst-estimates (annual/quarter) | APIキー必要・スナップショット蓄積 |
| 3 | Finnhub revenue-estimate | APIキー必要・スナップショット蓄積 |
| 4 | Alpha Vantage EARNINGS | estimatedRevenue フィールド（銘柄依存） |
| 5 | Estimate Snapshot | 同一 fiscal period の30日前スナップショット比較 |

## APIキー状態

| キー | 状態 |
|------|------|
| FMP_API_KEY | 未設定 |
| FINNHUB/EARNINGS | 未設定 |
| ALPHA_VANTAGE | 未設定 |

## Live Verify 結果

**Revenue Revision: 0/6** · **Pipeline: 6/6**

| Code | Label | Rev 30D | Source | EPS 30D | Direction | Score | Pipeline | Rev Rev |
|------|-------|---------|--------|---------|-----------|-------|----------|---------|
| 1155 | Maybank | データ未取得 | yahoo_finance | -3.3% | Stable（横ばい） | -4 | PASS | FAIL |
| 1023 | CIMB | データ未取得 | yahoo_finance | -1.3% | Stable（横ばい） | -4 | PASS | FAIL |
| 1295 | Public Bank | データ未取得 | yahoo_finance | +0.1% | Stable（横ばい） | -4 | PASS | FAIL |
| 5347 | Tenaga | データ未取得 | yahoo_finance | -0.2% | Stable（横ばい） | +4 | PASS | FAIL |
| 4707 | Nestle | データ未取得 | yahoo_finance | -0.4% | Stable（横ばい） | -4 | PASS | FAIL |
| 6033 | Petronas Gas | データ未取得 | yahoo_finance | -1.2% | Stable（横ばい） | -4 | PASS | FAIL |

## 再実行
```bash
npx vitest run tests/unit/bursaRevenueRevisionProviders.test.ts tests/unit/bursaPhase23.test.ts tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
```
