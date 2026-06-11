# Phase18 News Intelligence 監査レポート

実行日時: 2026-06-10T07:53:44.976Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. 取得率

| 指標 | 値 |
|------|-----|
| 平均ソースカバレッジ（5ソース中） | 80% |
| 平均フィールド取得率 | 90% |
| 平均記事数（重複排除後） | 19.8 |
| NewsAPIキー | 未設定（Yahoo/RSS/KLSEで代替） |

取得ソース: NewsAPI / Yahoo Finance News / Bursa Announcements / RSS News / Company Announcement

## 2. Sentiment精度

ルールベース分類（Bullish/Neutral/Bearish）を headline キーワードで判定。
各記事の assigned sentiment と再分類結果の一致率 ≥85% を合格基準とする。

| 銘柄 | B | N | Be | 記事数 |
|------|---|---|----|--------|
| Maybank (1155) | 1 | 22 | 0 | 20 |
| CIMB (1023) | 1 | 24 | 0 | 20 |
| Public Bank (1295) | 1 | 18 | 0 | 19 |
| Tenaga (5347) | 0 | 22 | 1 | 20 |
| Nestle (4707) | 0 | 23 | 0 | 20 |
| Petronas Gas (6033) | 0 | 24 | 0 | 20 |

## 3. 6銘柄ライブ結果

| 銘柄 | ソース | 24h | 取得率 | Top Event | News補助 |
|------|--------|-----|--------|-----------|----------|
| Maybank (1155) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 0 | 89% | Earnings | +0.5 |
| CIMB (1023) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 1 | 89% | Other | +0.5 |
| Public Bank (1295) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 1 | 90% | Other | +0.5 |
| Tenaga (5347) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 0 | 91% | Earnings | -0.5 |
| Nestle (4707) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 1 | 92% | Other | +0 |
| Petronas Gas (6033) | yahoo_finance_news, bursa_announcements, rss_news, company_announcement | 2 | 91% | Other | +0 |

## 4. AIスコア変化（Phase18追加前後）

Phase11ニュース重複を除外し、News Intelligence 集約（-20〜+20）のみを材料スコアに反映。

| 銘柄 | 変更前 | 変更後 | Δ |
|------|--------|--------|---|
| Maybank (1155) | 32 | 32 | +0 |
| CIMB (1023) | 32 | 32 | +0 |
| Public Bank (1295) | 32 | 32 | +0 |
| Tenaga (5347) | 30 | 30 | +0 |
| Nestle (4707) | 18 | 18 | +0 |
| Petronas Gas (6033) | 20 | 20 | +0 |

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、News補助±20以内、ソースカバレッジ≥20%。