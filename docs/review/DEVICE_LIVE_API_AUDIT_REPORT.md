# 実機ライブ API 監査レポート

実行: 2026-06-11T13:07:30.109Z

## 判定サマリー

| 区分 | 結果 |
|------|------|
| Node監査 | **FAIL（監査スクリプト制限）** |
| 実機監査 | **FAIL** |
| 12時間テスト可否 | **要対応** |

> 監査スクリプト制限 — SecureStore は Node から復号不可
> Node FAIL + 実機PASS の場合は 12時間テスト可（実機結果優先）

## Node監査（.env のみ）

| API | Node | SecureStore | 備考 |
|-----|------|-------------|------|
| NewsAPI | FAIL | 保存済 | 監査スクリプト制限 |
| X API | FAIL | 保存済 | 監査スクリプト制限 |

## 実機接続テスト（SecureStore キー）

### NewsAPI
- HTTP Status: **200**
- 取得件数: **5**
- 結果: PASS

### X API
- HTTP Status: **200**
- 取得件数: **10**
- 結果: PASS

## 6銘柄 NewsAPI ニュース

| 銘柄 | HTTP | 件数 | 結果 |
|------|------|------|------|
| 1155 Maybank | 200 | 0 | FAIL |
| 1023 CIMB | 200 | 0 | FAIL |
| 1295 Public Bank | 200 | 0 | FAIL |
| 5347 Tenaga | 200 | 0 | FAIL |
| 4707 Nestle | 200 | 0 | FAIL |
| 6033 Petronas Gas | 200 | 0 | FAIL |

## 最終判定: FAIL — 実機監査NG