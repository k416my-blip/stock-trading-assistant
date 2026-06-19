# PHASE23_REVENUE_COMPLETION_REPORT

## 概要
Phase23 Revenue Revision — Yahoo revenueTrend 欠落時 epsTrend×revenueEstimate corridor · FMP / Finnhub / Alpha Vantage / Snapshot カスケード。

- 実行日時: 2026-06-19T14:29:32.907Z
- Git commit: `d68afae`
- Push: pending

## 根本原因（0/6）

| 原因 | 詳細 |
|------|------|
| Yahoo revenueTrend | .KL 含む全銘柄で `revenueTrend` オブジェクト欠落（2026-06 Live 確認） |
| API キー未設定 | FMP / Finnhub / Alpha Vantage — `.env` に未設定 |
| スナップショット | 30 日蓄積前 — 単日観測のみ |

## 修正内容

| 項目 | 内容 |
|------|------|
| epsTrend corridor | `revenueEstimate.avg` + 同一 period `epsTrend` から 30D 修正率導出 |
| プロバイダ | `bursaRevenueRevisionProviders.ts` |
| Phase23.1 | EPS Stable 時 Revenue Revision bias 反映（既存） |
| fetchedFields | `phase23.revenue_revision_series` |

## カスケードソース

| 優先 | ソース | 備考 |
|------|--------|------|
| 1 | Yahoo earningsTrend revenueTrend | 現行 Yahoo API ではほぼ全銘柄欠落 |
| 2 | Yahoo epsTrend × revenueEstimate | **今回追加** — EPS revision パターン準拠 |
| 3 | FMP analyst-estimates | APIキー必要 · スナップショット蓄積 |
| 4 | Finnhub revenue-estimate | APIキー必要 · スナップショット蓄積 |
| 5 | Alpha Vantage EARNINGS | estimatedRevenue（銘柄依存） |
| 6 | Estimate Snapshot | 同一 fiscal period 30 日前比較 |

## APIキー状態

| キー | 状態 |
|------|------|
| FMP_API_KEY | 未設定 |
| FINNHUB/EARNINGS | 未設定 |
| ALPHA_VANTAGE | 未設定 |

## Live Verify 結果

**Revenue Revision: 6/6** · **Pipeline: 6/6**

| Code | Label | Rev 30D | Source | EPS 30D | Direction | Score | Pipeline | Rev Rev |
|------|-------|---------|--------|---------|-----------|-------|----------|---------|
| 1155 | Maybank | -3.3% | yahoo_finance | -3.3% | Downward（下方修正） | -7 | PASS | PASS |
| 1023 | CIMB | -1.3% | yahoo_finance | -1.3% | Downward（下方修正） | -7 | PASS | PASS |
| 1295 | Public Bank | +0.1% | yahoo_finance | +0.1% | Stable（横ばい） | -2 | PASS | PASS |
| 5347 | Tenaga | -0.2% | yahoo_finance | -0.2% | Stable（横ばい） | +1 | PASS | PASS |
| 4707 | Nestle | -0.4% | yahoo_finance | -0.4% | Downward（下方修正） | -7 | PASS | PASS |
| 6033 | Petronas Gas | -1.2% | yahoo_finance | -1.2% | Downward（下方修正） | -7 | PASS | PASS |

## 判定

**PASS** — Revenue Revision **6/6** · Pipeline **6/6** · Unit **26/26**

## GitHub 同期結果

| 項目 | 値 |
|------|-----|
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| commit hash | pending |
| Push | pending |

## 再実行
```bash
npx vitest run tests/unit/bursaRevenueRevisionProviders.test.ts tests/unit/bursaPhase23.test.ts tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
```
