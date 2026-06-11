# Phase16.6 Historical Ownership — 実機検証レポート

## 総合判定: **PASS**

| 項目 | 結果 |
|------|------|
| 検証開始 (UTC) | 2026-06-10T06:39:39.484Z |
| 検証終了 (UTC) | 2026-06-10T06:40:36.151Z |
| 取得成功数 | **6 / 6** |
| クラッシュ | **0** |

## 6銘柄結果

| 銘柄 | 成功/失敗 | 履歴件数 | 3M | 6M | 12M | Trend | Confidence |
|------|-----------|----------|----|----|-----|-------|------------|
| 1155 Maybank | 成功 | 35 | +314.30% | +314.30% | +314.30% | Strong Accumulation | 100 |
| 1023 CIMB | 成功 | 33 | +31.85% | +31.85% | +31.85% | Strong Accumulation | 100 |
| 1295 Public Bank | 成功 | 25 | +29.46% | +29.46% | +29.46% | Strong Accumulation | 100 |
| 5347 Tenaga | 成功 | 20 | +29.89% | +29.89% | +29.89% | Strong Accumulation | 100 |
| 4707 Nestle | 成功 | 38 | +10.63% | +10.63% | +10.63% | Strong Accumulation | 100 |
| 6033 Petronas Gas | 成功 | 46 | +1.09% | +74.72% | +74.72% | Strong Accumulation | 100 |

## AIスコア影響

- Phase16.5 Institutional Trend は Historical の 3M/6M/12M で `trendDirection` を上書き
- 材料スコア: Strong Accumulation +12 / Accumulation +6 / Distribution -6 / Strong Distribution -12（Phase16.5 既存ロジック）
- Phase16 Ownership Net Flow は変更なし

## 銘柄別 Trend（Historical 適用後）

- **1155 Maybank**: Institutional Trend · 12M +314.30% · Strong Accumulation · [Historical 3M/6M/12M]
- **1023 CIMB**: Institutional Trend · 12M +31.85% · Strong Accumulation · [Historical 3M/6M/12M]
- **1295 Public Bank**: Institutional Trend · 12M +29.46% · Strong Accumulation · [Historical 3M/6M/12M]
- **5347 Tenaga**: Institutional Trend · 12M +29.89% · Strong Accumulation · [Historical 3M/6M/12M]
- **4707 Nestle**: Institutional Trend · 12M +10.63% · Strong Accumulation · [Historical 3M/6M/12M]
- **6033 Petronas Gas**: Institutional Trend · 12M +74.72% · Strong Accumulation · [Historical 3M/6M/12M]

## テスト

```powershell
npx vitest run tests/unit/bursaPhase16Historical.test.ts
npx tsx scripts/bursa-phase16-historical-device-verify.ts
```
