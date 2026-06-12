# 12時間テスト APIキー監査レポート

実行: 2026-06-10T13:26:08.425Z

## 1. キー取得経路

### NewsAPI
- SecureStore: **FAIL**
- .env NEWS_API_KEY: なし
- EXPO_PUBLIC_NEWS_API_KEY: なし
- Node解決: FAIL — .env未設定

### X API Bearer
- SecureStore: **FAIL**
- .env X_BEARER_TOKEN: なし
- EXPO_PUBLIC_X_BEARER_TOKEN: なし
- Node解決: FAIL — .env未設定

## 2. 接続テスト（Node / .envキー）

| API | 結果 | 詳細 |
|-----|------|------|
| NewsAPI | FAIL | no_env_key |
| X API | FAIL | no_env_key |

## 3. 6銘柄 NewsAPI

| 銘柄 | 結果 | 件数 |
|------|------|------|
| 1155 Maybank | FAIL | 0 |
| 1023 CIMB | FAIL | 0 |
| 1295 Public Bank | FAIL | 0 |
| 5347 Tenaga | FAIL | 0 |
| 4707 Nestle | FAIL | 0 |
| 6033 Petronas Gas | FAIL | 0 |

## 4. 判定

- キー経路（実機SecureStore）: News **FAIL** / X **FAIL**
- Node監査用 .env: News **FAIL** / X **FAIL**
- 接続テスト: News **FAIL** / X **FAIL**
- 6銘柄ニュース: **FAIL**

