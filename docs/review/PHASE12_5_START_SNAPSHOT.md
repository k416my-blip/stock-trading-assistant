# Phase12.5 12時間テスト — 開始時点スナップショット

ChatGPT監査用 · テスト開始直後の状態記録

---

## 開始日時

| 項目 | 値 |
|------|-----|
| **UTC** | `2026-06-10T15:07:24.453Z` |
| **JST** | `2026-06-11 00:07:24` |
| **計画時間** | 12 時間 |
| **終了予定 (UTC)** | `2026-06-11T03:07:51.662Z` |
| **実機 (adb)** | `FYRWXSNNAIOR9DCM` |
| **テスト状態** | `RUNNING` |

---

## アプリ Version

| 項目 | 値 |
|------|-----|
| **versionName** | `1.0.0` |
| **versionCode** | `2` |
| **Expo version** | `1.0.0` |
| **package** | `com.assistant.stocktrading` |
| **アプリ名** | Rakuten Trade MY 助手 |

---

## 保有銘柄数

| 項目 | 値 |
|------|-----|
| **保有銘柄数** | **1** |
| **銘柄一覧** | `0941` (HK · China Mobile) |
| **データソース** | 実機 AsyncStorage `@sta/app_state` |
| **備考** | 12時間監視対象の6銘柄 (Bursa) は保有リスト外。検証は adb UI 操作 + 材料分析で実施 |

---

## 6銘柄 現在株価（監視対象）

取得: Yahoo Finance Chart API (`{code}.KL`) · `2026-06-10T15:14:00Z` 頃（テスト開始直後）

| コード | 銘柄 | 現在株価 | 通貨 |
|--------|------|----------|------|
| 1155 | Maybank | **10.68** | MYR |
| 1023 | CIMB | **7.40** | MYR |
| 1295 | Public Bank | **4.80** | MYR |
| 5347 | Tenaga | **14.22** | MYR |
| 4707 | Nestle | **93.78** | MYR |
| 6033 | Petronas Gas | **17.22** | MYR |

> アプリ内 quote_cache には開始時点で HK:0941 のみ保存。6銘柄は Twelve Data 経由の個別キャッシュなし（非保有のため）。

---

## OpenAI 状態

| 項目 | 値 |
|------|-----|
| **SecureStore キー** | 保存済 (`sta.secret.ai_api_key`) |
| **最終ヘルスチェック** | `2026-06-09T00:07:54.783Z` |
| **ステータス** | **OK** — 実API接続成功 |
| **pingSummary** | `output_text OK` |
| **mock フォールバック** | なし |

---

## TwelveData 状態

| 項目 | 値 |
|------|-----|
| **SecureStore キー** | 保存済 (`sta.secret.twelve_data_api_key`) |
| **診断 (market_data_diagnostics)** | 更新 `2026-06-10` |
| **株価取得成功** | 115 回 |
| **株価取得失敗** | 0 回 |
| **レート制限** | 0 回 |
| **最終成功更新** | `2026-06-10T15:12:15.456Z` |
| **ステータス** | **稼働中** — 当日 209 API calls、timeout 0 |

---

## NewsAPI 状態

| 項目 | 値 |
|------|-----|
| **SecureStore キー** | 保存済 (`sta.secret.news_api_key`) |
| **実機監査 (直前)** | `2026-06-10T14:31:56Z` |
| **HTTP Status** | **429** |
| **取得件数** | 0 |
| **分類** | `NEWSAPI_TEMP_RATE_LIMIT` (Developer 100req/24h 上限) |
| **ステータス** | **一時制限** — RSS / Yahoo / Google / Reddit フォールバックで材料分析継続可 |

---

## X API 状態

| 項目 | 値 |
|------|-----|
| **SecureStore キー** | 保存済 (`sta.secret.x_api_key`) |
| **実機監査 (直前)** | `2026-06-10T14:31:56Z` |
| **HTTP Status** | **200** |
| **取得件数** | 10 tweets |
| **ステータス** | **OK** |

---

## AsyncStorage サイズ

| 項目 | KB | 備考 |
|------|-----|------|
| **RKStorage** | 1,752 | `@sta/*` キー格納 |
| **アプリデータ合計** | 22,352 | `run-as du -sk .` |
| **計測時刻** | `2026-06-10T15:07〜15:12` | テスト開始直後 |

---

## メモリ使用量

| 項目 | 値 |
|------|-----|
| **TOTAL PSS (baseline)** | **396,222 KB** (~387 MB) |
| **計測時刻** | `2026-06-10T15:07:48.265Z` |
| **ソース** | `adb shell dumpsys meminfo com.assistant.stocktrading` |
| **エビデンス** | `docs/review/phase12-5-long-run/meminfo-baseline.txt` |
| **Hour 0 checkpoint** | `docs/review/phase12-5-long-run/checkpoint.json` |

---

## スクリーンショット保存先

| 種別 | パス |
|------|------|
| **開始時点 (Hour 0 AI分析)** | `docs/review/phase12-5-long-run/ai-hour-0.png` |
| **エビデンスディレクトリ** | `docs/review/phase12-5-long-run/` |
| **UI dump (adb)** | `docs/review/phase12-5-long-run/*.xml` |
| **meminfo 時系列** | `docs/review/phase12-5-long-run/meminfo-hour-*.txt` |
| **実行ログ** | `docs/review/phase12-5-long-run/runner.log` |
| **テレメトリ** | `docs/review/phase12-5-long-run/telemetry.jsonl` |
| **1時間 checkpoint** | `docs/review/phase12-5-long-run/checkpoint.json` |
| **最終レポート (12h後)** | `docs/review/PHASE12_5_LONG_RUN_REPORT.md` |

---

## 関連監査レポート

- `docs/review/DEVICE_LIVE_API_AUDIT_REPORT.md` — NewsAPI/X 実機監査
- `docs/review/newsapi-429-diagnosis/NEWSAPI_429_REPORT.md` — 429 原因
- `docs/review/material-fallback-audit/MATERIAL_FALLBACK_AUDIT.md` — フォールバック検証
- `docs/review/phase12-5-long-run/start-snapshot-data.json` — 機械可読データ

---

*生成: Phase12.5 long-run start snapshot · `2026-06-10T15:14:00Z`*
