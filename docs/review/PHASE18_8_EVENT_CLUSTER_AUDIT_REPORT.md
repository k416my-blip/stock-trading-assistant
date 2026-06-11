# Phase18.8 Multi-Article Event Aggregation 監査レポート

実行日時: 2026-06-10T08:49:39.996Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. Event Cluster数

全銘柄合計クラスタ数: **20**

| 銘柄 | Cluster数 |
|------|-----------|
| Maybank (1155) | 4 |
| CIMB (1023) | 2 |
| Public Bank (1295) | 4 |
| Tenaga (5347) | 3 |
| Nestle (4707) | 2 |
| Petronas Gas (6033) | 5 |

## 2. 上位10イベント（EventScore順）

EventScore = Impact × FrequencyWeight × SourceWeight × TimeWeight

| 順位 | 銘柄 | Event Cluster | Score | 記事数 | ソース数 |
|------|------|---------------|-------|--------|----------|
| 1 | Petronas Gas | Partnership | 20 | 3 | 2 |
| 2 | CIMB | Regulatory | 7 | 5 | 2 |
| 3 | Petronas Gas | Dividend Increase | 7 | 1 | 1 |
| 4 | Petronas Gas | Other | 6 | 13 | 4 |
| 5 | Nestle | Regulatory | 5 | 6 | 2 |
| 6 | Public Bank | Other | 4 | 14 | 4 |
| 7 | Tenaga | Regulatory | 4 | 5 | 1 |
| 8 | Petronas Gas | Commodity | 4 | 2 | 1 |
| 9 | Petronas Gas | Regulatory | 4 | 5 | 1 |
| 10 | Maybank | Regulatory | 3 | 3 | 1 |

## 3. 6銘柄ライブ結果

| 銘柄 | Clusters | Top Cluster | Top Score |
|------|----------|-------------|-----------|
| Maybank (1155) | 4 | Regulatory Cluster | 3 |
| CIMB (1023) | 2 | Regulatory Cluster | 7 |
| Public Bank (1295) | 4 | Other Cluster | 4 |
| Tenaga (5347) | 3 | Regulatory Cluster | 4 |
| Nestle (4707) | 2 | Regulatory Cluster | 5 |
| Petronas Gas (6033) | 5 | Partnership Cluster | 20 |

## 4. News補助比較（18.7 vs 18.8）

| 銘柄 | 18.7記事単位 | 18.8クラスタ | Δ |
|------|-------------|-------------|---|
| Maybank (1155) | +0.3 | +0 | -0.3 |
| CIMB (1023) | +0.3 | +0 | -0.3 |
| Public Bank (1295) | +1.6 | +0.4 | -1.2000000000000002 |
| Tenaga (5347) | -0.5 | +0 | +0.5 |
| Nestle (4707) | +0 | +0 | +0 |
| Petronas Gas (6033) | +16.5 | +4 | -12.5 |

18.8は同一Eventの記事頻度・ソース多様性・時間減衰でEventScoreを増幅。

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Cluster≥2、News補助±20以内。