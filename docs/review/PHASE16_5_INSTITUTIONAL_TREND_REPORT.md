# Phase16.5 Institutional Trend — 実機検証レポート

## 総合判定: **PASS**

| 項目 | 結果 |
|------|------|
| 検証開始 (UTC) | 2026-06-10T06:29:10.546Z |
| 検証終了 (UTC) | 2026-06-10T06:29:42.333Z |
| 対象銘柄 | 1155, 1023, 1295, 5347, 4707, 6033 |
| **取得成功数** | **6 / 6** |
| クラッシュ | **0** |

---

## 実装ファイル

- `src/types/bursaInstitutionalTrend.ts`
- `src/services/bursa/bursaInstitutionalTrendParser.ts`
- `src/services/bursa/bursaInstitutionalTrendService.ts`
- `src/services/bursa/bursaPhase16TrendAnalysis.ts`
- `tests/unit/bursaPhase16Trend.test.ts`
- `scripts/bursa-phase16-trend-device-verify.ts`

---

## 6銘柄結果

| 銘柄 | 成功/失敗 | 前回% | 現在% | 増減率 | 3M | 6M | 12M | Trend | Confidence |
|------|-----------|-------|-------|--------|----|----|-----|-------|------------|
| 1155 Maybank | 成功 | 51.67% | 51.67% | 0.00% | 未取得 | 未取得 | 未取得 | Neutral | 55 |
| 1023 CIMB | 成功 | 23.51% | 23.47% | -0.17% | 未取得 | 未取得 | 未取得 | Neutral | 55 |
| 1295 Public Bank | 成功 | 22.41% | 22.41% | 0.00% | 未取得 | 未取得 | 未取得 | Neutral | 55 |
| 5347 Tenaga | 成功 | 31.81% | 31.81% | 0.00% | 未取得 | 未取得 | 未取得 | Neutral | 55 |
| 4707 Nestle | 成功 | 14.73% | 14.73% | 0.00% | +10.63% | 未取得 | 未取得 | Neutral | 70 |
| 6033 Petronas Gas | 成功 | 23.72% | 23.72% | 0.00% | +1.09% | 未取得 | 未取得 | Neutral | 70 |

---

## Trend判定一覧

- **1155 Maybank**: Neutral（増減 0.00%）
- **1023 CIMB**: Neutral（増減 -0.17%）
- **1295 Public Bank**: Neutral（増減 0.00%）
- **5347 Tenaga**: Neutral（増減 0.00%）
- **4707 Nestle**: Neutral（増減 0.00%）
- **6033 Petronas Gas**: Neutral（増減 0.00%）

---

## AI分析への影響

- **独立項目12**「Institutional Trend評価」として追加（Ownership とは別）
- 増減トレンドを材料スコアへ補助反映（Strong Accumulation +12 / Accumulation +6 / Distribution -6 / Strong Distribution -12）
- Phase16 Ownership の Net Flow は保有スナップショットベースのまま維持
- 単独では売買判定を決定しない

---

## 既存機能への影響

- Phase13〜16 — 変更なし（チェーン末尾に Phase16.5 追加のみ）
- News / X / Reddit — 変更なし

---

## テスト結果

- `tests/unit/bursaPhase16Trend.test.ts` — **6/6 PASS**
- 本スクリプト — **6/6 ライブ取得** / クラッシュ **0** 件

## 残課題

- KLSE Shareholdings ページの履歴深度が浅く、6M/12M トレンドは多くの銘柄で「未取得」
- 長期トレンド精度向上には Bursa 開示履歴の追加取得が必要
- `trendDirection` は直近2報告間の相対増減率で判定（3M/6M/12M は参考表示）

---

## 再実行

```powershell
npx vitest run tests/unit/bursaPhase16Trend.test.ts
npx tsx scripts/bursa-phase16-trend-device-verify.ts
```
