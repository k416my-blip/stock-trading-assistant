# NEWSAPI_CONNECTION_DEBUG_REPORT

## 概要

v16 実機で NewsAPI 接続テストが失敗する問題に対し、2段階 endpoint 診断・dual auth・HTTP status / body 表示を実装。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| 対象 APK | versionCode 16 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |

---

## 根本原因（想定）

| 問題 | 内容 |
|------|------|
| 旧テスト endpoint | `top-headlines?q=Maybank` — パラメータ組み合わせが不安定 |
| everything 依存 | Developer プランでは `/everything` は **localhost 限定** → 実機で 426 `upgradeRequired` |
| 診断不足 | HTTP status / body 分類が UI・logcat に出ず切り分け不可 |
| auth 方式 | `X-Api-Key` のみ試行 |

---

## 実装した 2 段階テスト

| Stage | Endpoint | 用途 |
|-------|----------|------|
| **A** | `GET /v2/top-headlines?country=us&pageSize=5` | 実機向け primary（Developer プラン可） |
| **B** | `GET /v2/everything?q=Maybank&pageSize=5&language=en` | 診断用 secondary |

各 stage で以下を **順に試行**:

1. `X-Api-Key: {key}`
2. `Authorization: Bearer {key}`

**採用ルール:** 記事取得成功 → 429 一時制限 → 最良エラー情報の順で winner を決定。

---

## エラー分類（UI / logcat）

| 分類 | 条件 | 表示ラベル |
|------|------|------------|
| `invalid_key` | HTTP 401 / `apiKeyInvalid` | 401 · APIキー無効 |
| `plan_or_rate_limit` | HTTP 426/429 / `rateLimited` / `upgradeRequired` | 426/429 · プラン制限またはレート制限 |
| `bad_request` | HTTP 400 / `parameterInvalid` | 400 · パラメータ不正 |
| `network_error` | status 0 / fetch 例外 / タイムアウト | network error · 通信失敗 |
| `success` | 200 + 記事 or 429 一時成功 | 接続成功 |

---

## 修正ファイル

| ファイル | 変更 |
|----------|------|
| `src/services/newsApiConnectionDebug.ts` | **新規** — 2段階プローブ、分類、マスク、logcat |
| `src/services/newsApiEverythingTest.ts` | connection test ラッパー |
| `src/services/newsApiClient.ts` | adopted auth + Stage A fallback |
| `src/services/apiHealth.ts` | NewsAPI 接続テストを debug モジュールへ統合 |
| `src/screens/SettingsScreen.tsx` | HTTP status / body要約 / プローブ一覧 UI |
| `tests/unit/newsApiConnectionDebug.test.ts` | **新規** |

---

## 採用 endpoint（設計）

| 環境 | 採用 |
|------|------|
| 実機 v16（Developer プラン） | **Stage A** `top-headlines?country=us&pageSize=5` |
| auth | 成功した方式を `getAdoptedNewsApiAuthMode()` に保存（通常 `x-api-key`） |
| Stage B | 426 `upgradeRequired` で **plan 制限と判定**（失敗扱い · 診断のみ） |

---

## ユニットテスト結果

```
newsApiConnectionDebug.test.ts  5/5 PASS
newsApiEverythingTest.test.ts   2/2 PASS
newsApiClient.test.ts           2/2 PASS
```

模擬レスポンス:

| Probe | HTTP | body要約 |
|-------|------|----------|
| A · x-api-key | 200 | ok · 1 articles |
| A · bearer | 200 | ok · 1 articles |
| B · x-api-key | 426 | upgradeRequired: only localhost |
| B · bearer | 426 | upgradeRequired: only localhost |

---

## logcat タグ

```
[NEWSAPI_CONNECTION_TEST]
```

Settings → News API テスト実行時、各 probe と summary が JSON で出力されます。

---

## 実機確認手順

1. v16 APK 再インストール（本修正ビルド）
2. 設定 → NewsAPI キー保存
3. **接続テスト**（プロバイダ行）または **News API テスト**
4. UI で HTTP Status / 分類 / body要約 / プローブ 4 行を確認
5. `adb logcat -s ReactNativeJS | findstr NEWSAPI_CONNECTION_TEST`

---

## Git

| 項目 | 値 |
|------|-----|
| Commit | _(push 後に更新)_ |
| Push | _(push 後に更新)_ |
