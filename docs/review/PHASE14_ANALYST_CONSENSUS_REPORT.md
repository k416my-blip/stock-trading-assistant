# Phase14 Analyst Consensus — 実機検証レポート

## 総合判定: **PASS**

| 項目 | 結果 |
|------|------|
| 検証開始 (UTC) | 2026-06-10T05:29:46.960Z |
| 検証終了 (UTC) | 2026-06-10T05:29:48.896Z |
| 対象銘柄 | 1155, 1023, 1295, 5347, 4707, 6033 |
| Finnhub API Key | 未設定 |
| Alpha Vantage Key | 未設定 |
| FMP Key | 未設定 |
| **Rating/Target 取得率** | **6 / 6（100.0%）** |
| PASS条件① 4/6以上 RatingまたはTarget | PASS（6/6） |
| PASS条件② クラッシュ0 | PASS |
| PASS条件③ 未取得時安全表示 | PASS |

---

## 銘柄別結果

| 銘柄 | 取得元 | 成功/失敗 | Rating | Target Price | Upside | Analyst Count | Trend | Confidence |
|------|--------|-----------|--------|--------------|--------|---------------|-------|------------|
| 1155 Maybank | Yahoo Finance | 成功 | Buy | MYR 12.01 | +12.5% | 19 | Maintained | 100 |
| 1023 CIMB | Yahoo Finance | 成功 | Buy | MYR 9.03 | +22.0% | 20 | Maintained | 100 |
| 1295 Public Bank | Yahoo Finance | 成功 | Buy | MYR 5.45 | +12.5% | 19 | Maintained | 100 |
| 5347 Tenaga | Yahoo Finance | 成功 | Buy | MYR 16.42 | +15.4% | 21 | Maintained | 100 |
| 4707 Nestle | Yahoo Finance | 成功 | Hold | MYR 113.27 | +20.8% | 12 | Maintained | 100 |
| 6033 Petronas Gas | Yahoo Finance | 成功 | Buy | MYR 18.73 | +8.8% | 13 | Maintained | 100 |

---

## 銘柄別詳細

### 1155 — Maybank

- 評価1行: Analyst Consensus · Buy · Target MYR 12.01 · +12.5% · 19 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Buy
- Target Price: MYR 12.01
- Upside: +12.5%
- Analyst Count: 19
- EPS Forecast: Current FY 0.88 / Next FY 0.93
- Revenue Forecast: Current FY 30,657,811,350 / Next FY 32,228,133,730
- Consensus Trend: Maintained
- Confidence Score: 100


### 1023 — CIMB

- 評価1行: Analyst Consensus · Buy · Target MYR 9.03 · +22.0% · 20 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Buy
- Target Price: MYR 9.03
- Upside: +22.0%
- Analyst Count: 20
- EPS Forecast: Current FY 0.76 / Next FY 0.8
- Revenue Forecast: Current FY 23,116,786,330 / Next FY 24,308,245,530
- Consensus Trend: Maintained
- Confidence Score: 100


### 1295 — Public Bank

- 評価1行: Analyst Consensus · Buy · Target MYR 5.45 · +12.5% · 19 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Buy
- Target Price: MYR 5.45
- Upside: +12.5%
- Analyst Count: 19
- EPS Forecast: Current FY 0.39 / Next FY 0.41
- Revenue Forecast: Current FY 15,231,239,630 / Next FY 16,053,452,600
- Consensus Trend: Maintained
- Confidence Score: 100


### 5347 — Tenaga

- 評価1行: Analyst Consensus · Buy · Target MYR 16.42 · +15.4% · 21 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Buy
- Target Price: MYR 16.42
- Upside: +15.4%
- Analyst Count: 21
- EPS Forecast: Current FY 0.84 / Next FY 0.88
- Revenue Forecast: Current FY 68,628,278,990 / Next FY 71,194,345,560
- Consensus Trend: Maintained
- Confidence Score: 100


### 4707 — Nestle

- 評価1行: Analyst Consensus · Hold · Target MYR 113.27 · +20.8% · 12 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Hold
- Target Price: MYR 113.27
- Upside: +20.8%
- Analyst Count: 12
- EPS Forecast: Current FY 2.56 / Next FY 2.79
- Revenue Forecast: Current FY 7,228,917,430 / Next FY 7,549,652,560
- Consensus Trend: Maintained
- Confidence Score: 100


### 6033 — Petronas Gas

- 評価1行: Analyst Consensus · Buy · Target MYR 18.73 · +8.8% · 13 analysts · [Yahoo Finance]
- 取得元: Yahoo Finance
- Rating: Buy
- Target Price: MYR 18.73
- Upside: +8.8%
- Analyst Count: 13
- EPS Forecast: Current FY 0.94 / Next FY 0.97
- Revenue Forecast: Current FY 6,579,632,020 / Next FY 6,646,992,870
- Consensus Trend: Maintained
- Confidence Score: 100


## 取得優先順位

1. Finnhub → 2. Alpha Vantage → 3. FMP → 4. Yahoo Finance

未取得フィールドは `未取得`、全体未取得は `データ未取得`。推測値は生成しません。

---

## 再実行

```powershell
npx tsx scripts/bursa-phase14-device-verify.ts
```
