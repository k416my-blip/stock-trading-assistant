# 材料分析フォールバック監査（NewsAPI 429）

実行: 2026-06-10T14:50:46.039Z

## チェック結果

- newsApiBlocked: **PASS**
- newsApiItemsZero: **PASS**
- hasRss: **PASS**
- hasX: **FAIL**
- hasReddit: **PASS**
- materialItemsGenerated: **PASS**
- showsYahooRss: **PASS**
- showsGoogleRss: **PASS**
- showsX: **FAIL**
- showsReddit: **PASS**
- uiRowGenerated: **PASS**
- phase11Macro: **PASS**
- phase11Sector: **PASS**

## 取得ソース（itemCountBySource）

```json
{
  "Bursa Announcement": 5,
  "Yahoo Finance RSS": 6,
  "Google News RSS": 6,
  "Reddit RSS": 3,
  "Reddit": 3
}
```

## 最終判定: **12時間テスト開始可**