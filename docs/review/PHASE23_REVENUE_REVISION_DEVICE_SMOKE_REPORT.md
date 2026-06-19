# PHASE23_REVENUE_REVISION_DEVICE_SMOKE_REPORT

## 概要
Phase23 Revenue Revision 6銘柄 Live パイプライン検証。

- 実行日時: 2026-06-19T03:31:57.079Z
- Git commit: `bcb9ede`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| Revenue Revision PASS | 0/6 |
| Pipeline PASS | 6/6 |
| Device UI | **DEFERRED**（ADB 未接続 — パイプライン検証のみ） |

## 6銘柄 Revenue Revision 結果
| Code | Label | Rev 30D | Direction | Score | Status |
|------|-------|---------|-----------|-------|--------|
| 1155 | Maybank | データ未取得 | Stable（横ばい） | -4 | PARTIAL |
| 1023 | CIMB | データ未取得 | Stable（横ばい） | -4 | PARTIAL |
| 1295 | Public Bank | データ未取得 | Stable（横ばい） | -4 | PARTIAL |
| 5347 | Tenaga | データ未取得 | Stable（横ばい） | +4 | PARTIAL |
| 4707 | Nestle | データ未取得 | Stable（横ばい） | -4 | PARTIAL |
| 6033 | Petronas Gas | データ未取得 | Stable（横ばい） | -4 | PARTIAL |

## エラー
- なし

## 再実行
```bash
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
```
