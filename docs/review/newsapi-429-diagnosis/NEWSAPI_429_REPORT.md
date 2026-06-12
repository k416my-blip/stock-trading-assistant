# NewsAPI 429 診断レポート

実行: 2026-06-10T14:43:07.946Z

## 429 レスポンス全文

- **status**: 429
- **headers**: `docs/review/newsapi-429-diagnosis/429-response-headers.json`
- **body**: `docs/review/newsapi-429-diagnosis/429-response-body.txt`

### body 解析

```json
{
  "status": "error",
  "code": "rateLimited",
  "message": "You have made too many requests recently. Developer accounts are limited to 100 requests over a 24 hour period (50 requests available every 12 hours). Please upgrade to a paid plan if you need more requests."
}
```

### レスポンス内フィールド

| フィールド | 値 |
|-----------|-----|
| code (rateLimited) | rateLimited |
| message | You have made too many requests recently. Developer accounts are limited to 100 requests over a 24 hour period (50 requests available every 12 hours). Please upgrade to a paid plan if you need more requests. |
| Retry-After (header) | なし |
| X-RateLimit-Limit | なし |
| X-RateLimit-Remaining | なし |

## プラン推定

**Developer**（API error message より）

## ダッシュボード Usage

NewsAPI ダッシュボード（Current/Daily/Monthly Usage）は Web ログイン必須のため API からは取得不可。プラン・上限は 429 body の message から推定。

手動確認: https://newsapi.org/account

## 429 原因分類

**D_daily_limit** → D. 日次制限（Developer 100/24h）

## フォールバック（1155 Maybank）

| ソース | HTTP | 件数 | OK |
|--------|------|------|-----|
| yahooRss | 200 | 6 | PASS |
| googleRss | 200 | 29 | PASS |
| redditRss | 200 | 0 | FAIL |

## 回復条件

Developer プラン: 24時間で100リクエスト（12時間あたり50）。次の12時間ウィンドウまたは24時間経過後にクォータ回復。

## 12時間テスト開始可否

NewsAPI は一時制限中だが RSS / Reddit / X フォールバックで材料分析継続可能 → 12時間テスト開始可（NewsAPI_TEMP_RATE_LIMIT 扱い）