# PHASE23_REVENUE_DEVICE_SMOKE_REPORT

## 概要
Phase23 Revenue Revision 6銘柄 Live パイプライン検証 · Phase23.1 Cross Signal 連携確認。

- 実行日時: 2026-06-19T14:29:32.908Z
- Git commit: `d68afae`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| Revenue Revision PASS | 6/6 |
| Pipeline PASS | 6/6 |
| Device UI | **DEFERRED**（ADB 未接続 — パイプライン検証のみ） |

## 6銘柄 Revenue Revision 結果
| Code | Label | Rev 30D | Direction | Score | Status |
|------|-------|---------|-----------|-------|--------|
| 1155 | Maybank | -3.3% | Downward（下方修正） | -7 | PASS |
| 1023 | CIMB | -1.3% | Downward（下方修正） | -7 | PASS |
| 1295 | Public Bank | +0.1% | Stable（横ばい） | -2 | PASS |
| 5347 | Tenaga | -0.2% | Stable（横ばい） | +1 | PASS |
| 4707 | Nestle | -0.4% | Downward（下方修正） | -7 | PASS |
| 6033 | Petronas Gas | -1.2% | Downward（下方修正） | -7 | PASS |

## Phase23.1 Cross Signal 連携

| 銘柄 | EPS Direction | Rev 30D | Cross Signal bias（Stable 時 revenue 参照） |
|------|---------------|---------|---------------------------------------------|
| 1155 | Downward | -3.3% | EPS direction 優先（revenue 未参照） |
| 1023 | Downward | -1.3% | EPS direction 優先 |
| 1295 | Stable | +0.1% | neutral（±3% 閾値内） |
| 5347 | Stable | -0.2% | neutral（±3% 閾値内） |
| 4707 | Downward | -0.4% | EPS direction 優先 |
| 6033 | Downward | -1.2% | EPS direction 優先 |

**判定:** Revenue Revision データが全 6 銘柄で取得可能となり、Phase23.1 `resolveRevisionComponentBias` の Stable 時 revenue 分岐が機能可能。

## エラー
- なし

## 再実行
```bash
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
```
