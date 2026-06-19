# PHASE23_1_DEVICE_SMOKE_REPORT

## 概要
Phase23.1 Earnings Revision × Insider/Institutional Cross Signal の6銘柄 Live パイプライン検証。

- 実行日時: 2026-06-19T01:58:27.243Z
- Git commit: `daa8a3f`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| PASS | 6/6 |
| PARTIAL | 0/6 |
| FAIL | 0/6 |
| 判定 | **PASS** |

## 6銘柄 Cross Signal 結果
| Code | Label | Revision | Insider | Institutional | Cross Signal | Score | Align | MaterialScore | Status |
|------|-------|----------|---------|---------------|--------------|-------|-------|---------------|--------|
| 1155 | Maybank | Stable（横ばい） | 買い優勢 | Buying | Bullish（強気クロスシグナル） | 5 | 2 | 100 | PASS |
| 1023 | CIMB | Stable（横ばい） | 買い優勢 | Selling | Neutral（中立・乖離） | 0 | 0 | 100 | PASS |
| 1295 | Public Bank | Stable（横ばい） | 買い優勢 | Strong Selling | Neutral（中立・乖離） | 0 | 0 | 94 | PASS |
| 5347 | Tenaga | Stable（横ばい） | 買い優勢 | Strong Buying | Bullish（強気クロスシグナル） | 5 | 2 | 100 | PASS |
| 4707 | Nestle | Stable（横ばい） | 買い優勢 | Strong Buying | Bullish（強気クロスシグナル） | 5 | 2 | 77 | PASS |
| 6033 | Petronas Gas | Stable（横ばい） | 買い優勢 | Strong Buying | Bullish（強気クロスシグナル） | 5 | 2 | 91 | PASS |

## エラー
- なし

## 再実行
```bash
npx vitest run tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23_1-verify.ts
```
