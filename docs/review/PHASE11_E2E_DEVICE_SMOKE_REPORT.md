# PHASE11_E2E_DEVICE_SMOKE_REPORT

## 概要
Phase11 Live E2E 6銘柄パイプラインスモーク。

- 実行日時: 2026-06-19T03:54:44.052Z
- Git commit: `384276a`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| E2E PASS | 6/6 |
| PARTIAL | 0/6 |
| FAIL | 0/6 |
| クラッシュ | 0 |
| Device UI | **DEFERRED**（ADB 未接続 — パイプライン検証のみ） |

## 判定: **PASS**

## エラー
- なし

## 再実行
```bash
npx tsx scripts/bursa-phase11-e2e-verify.ts
```
