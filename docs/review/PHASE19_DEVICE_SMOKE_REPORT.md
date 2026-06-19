# PHASE19_DEVICE_SMOKE_REPORT

## 概要
Phase19 Live Macro Intelligence 6銘柄パイプライン検証。

- 実行日時: 2026-06-19T03:13:15.597Z
- Git commit: `58fb6b9`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| Live macro (4指標) | 3/4 |
| Pipeline PASS | 6/6 |
| 判定 | **PASS** |

## Device UI
**DEFERRED** — ADB device smoke not run; pipeline verified via `enrichStockWithMacroIntelligence` script path (same pattern as PHASE23_1_DEVICE_SMOKE_REPORT).

## 6銘柄 Macro Pipeline 結果
| Code | Label | Macro | Sector Impact | Live | Material Adj | Status |
|------|-------|-------|---------------|------|--------------|--------|
| 1155 | Maybank | +4 (Bullish) | -2 (銀行) | 11/12 | -2 | PASS |
| 1023 | CIMB | +4 (Bullish) | -2 (銀行) | 11/12 | -2 | PASS |
| 1295 | Public Bank | +4 (Bullish) | -2 (銀行) | 11/12 | -2 | PASS |
| 5347 | Tenaga | +4 (Bullish) | +2 (公益) | 11/12 | +2 | PASS |
| 4707 | Nestle | +4 (Bullish) | +1 (消費財) | 11/12 | +1 | PASS |
| 6033 | Petronas Gas | +4 (Bullish) | +2 (エネルギー) | 11/12 | +2 | PASS |

## エラー
- なし

## 再実行
```bash
npx tsx scripts/bursa-phase19-live-macro-verify.ts
```