# Phase18.5 News Impact Engine 監査レポート

実行日時: 2026-06-10T08:05:55.731Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. Event分類精度

16種Event（Guidance Raise/Cut, Contract Award, Dividend Increase/Cut 等）を優先パターンマッチで分類。
平均再分類一致率: **100%**（合格基準 ≥85%）

| 銘柄 | 分類精度 | Top Event | Top Impact | 記事数 |
|------|---------|-----------|------------|--------|
| Maybank (1155) | 100% | Guidance Raise | 90 | 20 |
| CIMB (1023) | 100% | Guidance Raise | 90 | 20 |
| Public Bank (1295) | 100% | Guidance Raise | 90 | 19 |
| Tenaga (5347) | 100% | Guidance Raise | 90 | 20 |
| Nestle (4707) | 100% | Guidance Raise | 90 | 20 |
| Petronas Gas (6033) | 100% | Earnings | 83 | 20 |

### 全銘柄 Event分布（上位）

- Other: 117
- Guidance Raise: 8
- Earnings: 7
- Dividend Increase: 4
- Commodity: 2

## 2. Impact分布

Event種別レンジに基づく0〜100スコア。low<40 / mid 40-69 / high≥70。

| 帯域 | 構成比 |
|------|--------|
| Low (<40) | 86% |
| Mid (40-69) | 3% |
| High (≥70) | 11% |

| 銘柄 | Low | Mid | High | 平均 | Max |
|------|-----|-----|------|------|-----|
| Maybank (1155) | 17 | 2 | 4 | 30.6 | 90 |
| CIMB (1023) | 24 | 0 | 1 | 18.0 | 90 |
| Public Bank (1295) | 12 | 1 | 6 | 40.6 | 90 |
| Tenaga (5347) | 22 | 0 | 2 | 20.7 | 90 |
| Nestle (4707) | 22 | 0 | 1 | 18.3 | 90 |
| Petronas Gas (6033) | 22 | 1 | 1 | 21.2 | 83 |

## 3. 6銘柄ライブ結果

Impact × Sentiment × 時間減衰（24h=1.0 / 3d=0.7 / 7d=0.4 / 30d=0.1）

| 銘柄 | News補助 | 評価 |
|------|----------|------|
| Maybank (1155) | +1.7 | 成功 |
| CIMB (1023) | +0.3 | 成功 |
| Public Bank (1295) | +0.5 | 成功 |
| Tenaga (5347) | -0.5 | 成功 |
| Nestle (4707) | +0 | 成功 |
| Petronas Gas (6033) | +0 | 成功 |

## 4. AIスコア変化

| 銘柄 | 変更前 | 変更後 | Δ |
|------|--------|--------|---|
| Maybank (1155) | 32 | 32 | +0 |
| CIMB (1023) | 32 | 32 | +0 |
| Public Bank (1295) | 32 | 32 | +0 |
| Tenaga (5347) | 30 | 30 | +0 |
| Nestle (4707) | 18 | 18 | +0 |
| Petronas Gas (6033) | 20 | 45 | +25 |

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Event分類≥85%、News補助±20以内。