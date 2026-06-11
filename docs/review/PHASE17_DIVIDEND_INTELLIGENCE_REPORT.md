# Phase17 Dividend Intelligence

## 取得項目

| 項目 | ソース優先 |
|------|-----------|
| Dividend Yield | KLSE → Yahoo（実データのみ） |
| Payout Ratio | 財務報告 / 四半期 |
| Dividend Growth Rate | KLSE配当履歴 |
| Consecutive Dividend Years | KLSE配当履歴 |
| 5Y Dividend CAGR | 5年推移 |
| Ex-Dividend / Payment Date | KLSE配当テーブル |
| Dividend Frequency | 直近2年の配当回数 |
| Special Dividend | 配当種別ラベル |
| Sustainability Score | 上記実データから算出 |

取得不可は「未取得」／「データ未取得」。推測値は生成しない。

## AI統合

- AI分析項目13: **Dividend Intelligence**
- 材料スコア補助のみ（±12上限）。単独売買トリガーなし。

## 検証

```powershell
npx vitest run tests/unit/bursaPhase17.test.ts
npx tsx scripts/bursa-phase16-7-phase17-audit-verify.ts
```

6銘柄実データは `PHASE16_7_PHASE17_AUDIT_REPORT.md` を参照。
