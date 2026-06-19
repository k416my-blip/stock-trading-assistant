# PHASE19_DEVICE_SMOKE_REPORT

## 概要
Phase19 Live Macro Intelligence 6銘柄パイプライン検証。

- 実行日時: 2026-06-19T14:18:52.169Z
- Git commit: `1df6313`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| Live macro (4指標) | 4/4 |
| Dashboard Live | 12/12 |
| Pipeline PASS | 6/6 |
| 判定 | **12/12 PASS** |

## Device UI
**DEFERRED** — ADB device smoke not run; pipeline verified via `enrichStockWithMacroIntelligence` script path (same pattern as PHASE23_1_DEVICE_SMOKE_REPORT).

## 6銘柄 Macro Pipeline 結果
| Code | Label | Macro | Sector Impact | Live | Material Adj | Status |
|------|-------|-------|---------------|------|--------------|--------|
| 1155 | Maybank | +7 (Bullish) | -5 (銀行) | 12/12 | -5 | PASS |
| 1023 | CIMB | +7 (Bullish) | -5 (銀行) | 12/12 | -5 | PASS |
| 1295 | Public Bank | +7 (Bullish) | -5 (銀行) | 12/12 | -5 | PASS |
| 5347 | Tenaga | +7 (Bullish) | +6 (公益) | 12/12 | +6 | PASS |
| 4707 | Nestle | +7 (Bullish) | +4 (消費財) | 12/12 | +4 | PASS |
| 6033 | Petronas Gas | +7 (Bullish) | +6 (エネルギー) | 12/12 | +6 | PASS |

## エラー
- なし

## 再実行
```bash
npx tsx scripts/bursa-phase19-live-macro-verify.ts
```