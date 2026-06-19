# NEWSAPI_CONNECTION_DEBUG_REPORT

## 概要

v16 実機で NewsAPI 接続テストが失敗する問題に対し、2段階 endpoint 診断・dual auth・HTTP status / body 表示を実装。  
**Developer プラン実機制限（426）** を検出し、**Google News RSS フォールバック** で接続テスト成功扱いに変更。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| 対象 APK | versionCode 16（RSS フォールバック込み再ビルド） |
| ブランチ | `cursor/top3-maxdd-capital-audit` |

---

## 根本原因（確定）

| 問題 | 内容 |
|------|------|
| Developer プラン制限 | **$0 Developer プランは localhost のみ** — 実機 APK からは **全 endpoint が HTTP 426** `upgradeRequired` |
| everything 依存 | `/everything` は Developer では localhost 限定（診断用 Stage B） |
| top-headlines も不可 | Stage A / A2 も実機では 426（NewsAPI 側が非 localhost を拒否） |
| Business プラン | $449/月 — 実機本番利用にはアップグレードが必要 |

**結論:** NewsAPI Developer キーは実機では直接利用不可。アプリは **RSS フォールバック** でニュース取得経路を確保。

---

## 実装した 3 段階 + RSS テスト

| Stage | Endpoint | 用途 |
|-------|----------|------|
| **A** | `GET /v2/top-headlines?country=us&pageSize=5` | primary |
| **A2** | `GET /v2/top-headlines?category=business&country=us&pageSize=5` | business カテゴリ |
| **B** | `GET /v2/everything?q=Maybank&pageSize=5&language=en` | 診断用 |
| **RSS** | `GET news.google.com/rss/search?q=Maybank` | NewsAPI 426 時の rescue |

各 NewsAPI stage で以下を **順に試行**:

1. `X-Api-Key: {key}`
2. `Authorization: Bearer {key}`

**採用ルール:**

1. NewsAPI 直接成功 → `adoptedNewsSource: newsapi`
2. 全 probe が 426 `production_blocked` かつ RSS 成功 → **全体 ok=true**, `adoptedNewsSource: rss`
3. 429 一時制限 → ok=true（一時成功）
4. それ以外 → 失敗 + 詳細診断

---

## エラー分類（UI / logcat）

| 分類 | 条件 | 表示ラベル |
|------|------|------------|
| `production_blocked` | HTTP 426 / `upgradeRequired` / localhost メッセージ | 426 · Developer プランは実機APK不可 |
| `invalid_key` | HTTP 401 / `apiKeyInvalid` | 401 · APIキー無効 |
| `plan_or_rate_limit` | HTTP 429 / `rateLimited` | 426/429 · プラン制限またはレート制限 |
| `bad_request` | HTTP 400 / `parameterInvalid` | 400 · パラメータ不正 |
| `network_error` | status 0 / fetch 例外 / タイムアウト | network error · 通信失敗 |
| `success` | 200 + 記事 / RSS rescue / 429 一時成功 | 接続成功 |

---

## 修正ファイル

| ファイル | 変更 |
|----------|------|
| `src/constants/newsApiRateLimit.ts` | `isNewsApiDeveloperProductionBlocked()` |
| `src/services/newsApiConnectionDebug.ts` | Stage A2、RSS fallback、production_blocked 分類 |
| `src/services/newsApiEverythingTest.ts` | 新フィールド対応 |
| `src/services/apiHealth.ts` | RSS rescue 時プロバイダ行「成功」 |
| `src/screens/SettingsScreen.tsx` | productionBlocked / RSS / 採用ニュース源 UI |
| `tests/unit/newsApiConnectionDebug.test.ts` | 426 + RSS rescue シナリオ |

---

## ユニットテスト結果

```
newsApiConnectionDebug.test.ts  6/6 PASS
newsApiEverythingTest.test.ts   2/2 PASS
```

426 全 probe 失敗 + RSS 200 模擬:

| 項目 | 値 |
|------|-----|
| ok | **true** |
| adoptedNewsSource | `rss` |
| productionBlocked | true |
| rssFallbackOk | true |
| errorReasonJa | NewsAPI Developerは実機不可（426）· RSSフォールバック成功 |

---

## logcat タグ

```
[NEWSAPI_CONNECTION_TEST]
```

`phase: rss_fallback` と `phase: summary` で rescue 判定を確認できます。

---

## 実機確認手順

1. RSS フォールバック込み v16 APK を再インストール
2. 設定 → NewsAPI キー保存
3. **接続テスト**（プロバイダ行）または **News API テスト**
4. 期待 UI:
   - **接続成功**（緑）
   - NewsAPI: Developer プラン実機制限（426）
   - RSS フォールバック: 成功（N件）
   - 採用ニュース源: RSS
5. `adb logcat -s ReactNativeJS | findstr NEWSAPI_CONNECTION_TEST`

---

## Git

| 項目 | 値 |
|------|-----|
| Commit | `5ee6df0` |
| Push | **Success** — `33dd82e..5ee6df0` → `origin/cursor/top3-maxdd-capital-audit` |
| APK | `artifacts/preview-v16-local.apk`（RSS fallback 込み再ビルド · 実機インストール済） |
