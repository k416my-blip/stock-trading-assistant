# Phase18.6 Event Validation Engine 監査レポート

実行日時: 2026-06-10T08:21:00.674Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. Event別件数（全銘柄合計）

Phase18.5問題: Guidance Raise 90 が大量発生 → Phase18.6で必須フレーズ検証。

| Event | 件数 |
|-------|------|
| Other | 132 |
| Dividend Increase | 4 |
| Earnings | 1 |
| Commodity | 1 |

**Guidance Raise 合計: 0**（Phase18.5: 8件/銘柄級 → 抑制目標 ≤3/銘柄）

## 2. Confidence分布

平均Confidence: **69.8**（low<50 / mid 50-79 / high≥80）

| 銘柄 | 平均Conf | High件数 | Stage1修正件数 |
|------|----------|----------|----------------|
| Maybank (1155) | 68.2 | 1 | 2 |
| CIMB (1023) | 72.0 | 0 | 0 |
| Public Bank (1295) | 66.7 | 0 | 2 |
| Tenaga (5347) | 69.9 | 0 | 1 |
| Nestle (4707) | 72.0 | 0 | 0 |
| Petronas Gas (6033) | 69.9 | 0 | 1 |

## 3. 誤分類サンプル（Stage1→Stage2修正）

- **Maybank**: [Earnings→Other] Conf22 — Malayan Banking Berhad Just Missed Earnings And Its Revenue Numbers Were Weaker Than Expected _(Earnings: required phrase missing → Other)_
- **Maybank**: [Earnings→Other] Conf22 — Malayan Banking Berhad's (KLSE:MAYBANK) five-year earnings growth trails the notable shareholder _(Earnings: required phrase missing → Other)_
- **Public Bank**: [Earnings→Other] Conf22 — Public Bank Bhd stock (MYL1295OO004): earnings momentum and regional banking footprint in focus  _(Earnings: required phrase missing → Other)_
- **Public Bank**: [Earnings→Other] Conf22 — Earnings Preview | Malaysian Banking Stocks Show Resilience Amid Global Market Volatility - Moom _(Earnings: required phrase missing → Other)_
- **Tenaga**: [Earnings→Other] Conf22 — Tenaga Nasional Bhd stock (MYL5347OO009): shares steady as investors look past recent earnings - _(Earnings: required phrase missing → Other)_
- **Petronas Gas**: [Earnings→Other] Conf22 — Petronas Gas Bhd stock (MYL6033OO004): earnings, projects and dividend profile - AD HOC NEWS _(Earnings: required phrase missing → Other)_

## 4. 6銘柄ライブ結果

| 銘柄 | G.Raise | Earnings | Contract | Other | Top Event | Conf | News補助 | Δ |
|------|---------|----------|----------|-------|-----------|------|----------|---|
| Maybank (1155) | 0 | 1 | 0 | 20 | Earnings | 84 | +0.3 | +0 |
| CIMB (1023) | 0 | 0 | 0 | 25 | Other | 72 | +0.3 | +0 |
| Public Bank (1295) | 0 | 0 | 0 | 18 | Dividend Increase | 72 | +0.5 | +0 |
| Tenaga (5347) | 0 | 0 | 0 | 24 | Other | 72 | -0.5 | +0 |
| Nestle (4707) | 0 | 0 | 0 | 23 | Other | 72 | +0 | +0 |
| Petronas Gas (6033) | 0 | 0 | 0 | 22 | Dividend Increase | 72 | +0 | +25 |

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Guidance Raise合計≤12、銘柄あたり≤3、平均Conf≥45。