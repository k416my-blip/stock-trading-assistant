# Phase19.5 Sector Rotation Intelligence 監査レポート

実行日時: 2026-06-10T12:09:33.956Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. Sector Ranking（9セクター）

#1 Energy: +5 (Bullish) | #2 Technology: +3 (Neutral) | #3 Banking: +0 (Neutral) | #4 REIT: -1 (Neutral) | #5 Utilities: -2 (Neutral) | #6 Industrial: -2 (Neutral) | #7 Healthcare: -2 (Neutral) | #8 Telecommunication: -2 (Neutral) | #9 Consumer: -3 (Neutral)

| Rank | Sector | Strength | Sentiment |
|------|--------|----------|-----------|
| #1 | Energy | +5 | Bullish |
| #2 | Technology | +3 | Neutral |
| #3 | Banking | +0 | Neutral |
| #4 | REIT | -1 | Neutral |
| #5 | Utilities | -2 | Neutral |
| #6 | Industrial | -2 | Neutral |
| #7 | Healthcare | -2 | Neutral |
| #8 | Telecommunication | -2 | Neutral |
| #9 | Consumer | -3 | Neutral |

### Top 3 Sector

- #1 **Energy** (+5)
- #2 **Technology** (+3)
- #3 **Banking** (+0)

### Bottom 3 Sector

- #9 **Consumer** (-3)
- #5 **Utilities** (-2)
- #6 **Industrial** (-2)

## 2. Score Distribution

| 指標 | 値 |
|------|-----|
| Bullish sectors | 1 |
| Neutral sectors | 8 |
| Bearish sectors | 0 |
| Min / Max / Avg | -3 / 5 / -0.4 |
| Macro Score (Phase19) | -2 |

算出要素: Fed Rate · US10Y · USD/MYR · DXY · Oil · Gold · KLCI · S&P500 · NASDAQ

## 3. 6銘柄影響

| 銘柄 | Macro | Rotation | MI Score | Rank | 補助 |
|------|-------|----------|----------|------|------|
| Maybank (1155) | -2 | +0 | -2 | #3 | -2 |
| CIMB (1023) | -2 | +0 | -2 | #3 | -2 |
| Public Bank (1295) | -2 | +0 | -2 | #3 | -2 |
| Tenaga (5347) | -2 | -2 | -4 | #5 | -4 |
| Nestle (4707) | -2 | -3 | -5 | #9 | -5 |
| Petronas Gas (6033) | -2 | +5 | +3 | #1 | +3 |

## 4. AIスコア変化（Phase19.5追加前後）

Macro Score + Sector Rotation Score = Macro Intelligence Score（材料補正はMIを±20にクランプ）

| 銘柄 | 変更前 | 変更後 | Δ | Top3 |
|------|--------|--------|---|------|
| Maybank (1155) | 32 | 32 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |
| CIMB (1023) | 32 | 32 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |
| Public Bank (1295) | 32 | 32 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |
| Tenaga (5347) | 30 | 30 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |
| Nestle (4707) | 18 | 18 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |
| Petronas Gas (6033) | 20 | 20 | +0 | Energy(+5) · Technology(+3) · Banking(+0 |

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、9セクターランキング構築、MI=Macro+Rotation、補正±20以内。