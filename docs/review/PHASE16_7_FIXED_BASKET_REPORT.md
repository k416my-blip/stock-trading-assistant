# Phase16.7 Fixed Institutional Basket

## 目的

Phase16.6 Historical Ownership の異常値（例: Maybank +314%）を、固定機関セットのみの比較で補正する。

## 固定バスケット

EPF · KWAP · PNB · Khazanah · ASNB · BlackRock · Vanguard · Norges Bank

## 算出ロジック

- 比較期間: 3M / 6M / 12M
- 同一機関が期間内に2点以上ある場合のみペアリング
- 新規発見機関（ペア不可）は増減率から除外
- 補正後トレンドを Historical Ownership に反映し、Phase16.5 Trend へ伝播

## 検証

```powershell
npx vitest run tests/unit/bursaPhase16Basket.test.ts
npx tsx scripts/bursa-phase16-7-phase17-audit-verify.ts
```

詳細な6銘柄比較は `PHASE16_7_PHASE17_AUDIT_REPORT.md` を参照。
