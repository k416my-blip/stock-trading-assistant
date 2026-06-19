# PHASE19_LIVE_MACRO_IMPLEMENTATION_REPORT

## 概要
Phase19 Macro Intelligence — 参照定数 `MACRO_REFERENCE_VALUES` を廃止し、ライブ取得プロバイダへ置換。

- 実行日時: 2026-06-19T03:13:15.597Z
- Git commit: `9f94786`
- Push: **OK** → `origin/cursor/top3-maxdd-capital-audit` (58fb6b9..9f94786)

## 実装サマリー

| 項目 | 内容 |
|------|------|
| ライブ指標 | fed_rate, my_opr, us_cpi, my_cpi |
| 参照定数 | `MACRO_REFERENCE_VALUES` 削除 |
| APIキー連携 | `loadAnalysisApiKeys()` → `buildGlobalMacroIntelligenceAnalysis({ apiKeys })` |
| キャッシュ | `forceRefresh` 時 `resetMacroLiveCache()` |

## カスケードソース

| 指標 | 優先順 |
|------|--------|
| fed_rate | FRED FEDFUNDS → Alpha Vantage FEDERAL_FUNDS_RATE → FMP federalFunds |
| us_cpi | FRED CPIAUCSL (YoY) → Alpha Vantage CPI → FMP CPI |
| my_cpi | World Bank FP.CPI.TOTL.ZG → FRED FPCPITOTLZGMYS |
| my_opr | BNM HTML parse → FMP economic calendar (MY OPR) |

## Live Verify 結果

| 指標 | fromLive | value | source | 判定 |
|------|----------|-------|--------|------|
| fed_rate | true | 3.63 | fred | PASS |
| my_opr | false | — | none | FAIL |
| us_cpi | true | 4.270032656680247 | fred | PASS |
| my_cpi | true | 1.834100204499 | world_bank | PASS |

**Live macro: 3/4** · **Pipeline: 6/6** · 判定: **PARTIAL/FAIL**

> **my_opr 未取得理由:** BNM サイトが CloudFront 403 を返却。`FMP_API_KEY` 未設定のため FMP calendar フォールバック未実行。

## Macro Dashboard（12指標）

Macro Score: **+4** (Bullish)
Live: 11/12 · B4/N6/Be2

- US Fed Rate: 3.63% -0.27% [Bullish]
- Malaysia OPR: — — [Neutral] (参照)
- US CPI (YoY): 4.27% +0.32% [Bearish]
- Malaysia CPI (YoY): 1.83% -0.65% [Neutral]
- US 10Y Treasury: 4.45% -0.27% [Neutral]
- USD/MYR: 4.13MYR +0.32% [Neutral]
- DXY: 100.86pt +0.77% [Bearish]
- Brent Oil: 79.53USD -0.40% [Neutral]
- Gold: 4190.60USD -1.30% [Bullish]
- S&P500: 7500.58pt +1.08% [Bullish]
- NASDAQ: 26517.93pt +1.91% [Bullish]
- KLCI: 1704.09pt -0.35% [Neutral]

## Sector Impact

銀行: -2 (Neutral) | 公益: +2 (Neutral) | 消費財: +1 (Neutral) | エネルギー: +2 (Neutral) | テクノロジー: -4 (Bearish)

## 6銘柄パイプライン

| 銘柄 | Sector | Macro | Sector Impact | Live | Status |
|------|--------|-------|---------------|------|--------|
| Maybank (1155) | 銀行 | +4 (Bullish) | -2 | 11/12 | PASS |
| CIMB (1023) | 銀行 | +4 (Bullish) | -2 | 11/12 | PASS |
| Public Bank (1295) | 銀行 | +4 (Bullish) | -2 | 11/12 | PASS |
| Tenaga (5347) | 公益 | +4 (Bullish) | +2 | 11/12 | PASS |
| Nestle (4707) | 消費財 | +4 (Bullish) | +1 | 11/12 | PASS |
| Petronas Gas (6033) | エネルギー | +4 (Bullish) | +2 | 11/12 | PASS |

## 再実行
```bash
npx vitest run tests/unit/bursaMacroLiveProviders.test.ts tests/unit/bursaPhase19.test.ts
npx tsx scripts/bursa-phase19-live-macro-verify.ts
```