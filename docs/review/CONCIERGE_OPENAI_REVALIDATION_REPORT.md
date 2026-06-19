# CONCIERGE_OPENAI_REVALIDATION_REPORT

## 概要

versionCode **17** ログ強化 APK にて「Maybankを分析」を再実行し、`[CONCIERGE_OPENAI] request_end` で OpenAI 失敗原因を確定した。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM` |
| APK | `artifacts/preview-v17-local.apk`（versionCode **17**） |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 自動化 | `scripts/bursa-concierge-openai-rootcause.mjs`（`RUN_COUNT=1` · `OUT_DIR=concierge-openai-revalidation`） |
| 証跡 | `docs/review/concierge-openai-revalidation/` |

---

## 結論

| 項目 | 判定 |
|------|------|
| OpenAI 本番呼び出し | **PASS** — HTTP **200** · `parseResult: ok` |
| 分類 | **openai_ok**（401/429/timeout ではない） |
| 先行調査の 4s モックフォールバック | **今回は再現せず** — キー有効化（設定接続テスト成功）後は実 API 応答 |

---

## `[CONCIERGE_OPENAI] request_end` 計測

| フィールド | 値 |
|------------|-----|
| `phase` | `request_end` |
| `elapsedMs` | **3792** |
| `httpStatus` | **200** |
| `responseSize` | **6997** bytes |
| `parseResult` | **`ok`** |
| `contentChars` | 678 |
| `timeout` | false |
| `timeoutMs` | 60000（設定） |
| `model` | `gpt-4o-mini` |

### イベント系列

| phase | 備考 |
|-------|------|
| `request_start` | `totalPromptChars: 26857` |
| `response_received` | `elapsedMs: 3785` · HTTP 200 |
| `request_end` | `parseResult: ok` |

---

## 失敗分類マトリクス

| 区分 | 今回 | 説明 |
|------|------|------|
| 401 invalid API key | **否** | HTTP 200 |
| 429 quota/rate limit | **否** | HTTP 200 |
| 400 request format | **否** | `parseResult: ok` |
| network error | **否** | 応答受信済み |
| parse error | **否** | `parseResult: ok` |
| **openai_ok** | **是** | 実 API 成功 |

---

## UI 観測

| 項目 | 値 |
|------|-----|
| `uiAiAnalysis` | **true** |
| `uiMock` | false |
| `uiTimeout` | false |
| 材料分析ロード | **true** |

---

## evidence 付与（修正前 APK での観測）

同一 Run の logcat では新規メッセージ `a-1781877085605` で `evidence_undefined` が残存（**Step 4 修正前ビルド**）。  
修正後の最終検証は `CONCIERGE_ENHANCED_ANALYSIS_FINAL_REPORT.md` 参照。

---

## 所見

1. Step 1 の設定画面接続テスト **成功** と整合 — OpenAI キーは有効。
2. 先行 rootcause の **401 推定**は、キー未確認・一時的失敗の可能性。本再検証では **200 OK**。
3. 巨大プロンプト（~27KB）でも **~3.8s** で完了（60s タイムアウト不要）。

---

## Git

| 項目 | 値 |
|------|-----|
| 検証時 HEAD | `a12eaf89164337cd1651f4f55704f7637d48fd43` |
| Commit hash（full） | `aad1895b911531c582027a36d4a4f22ef4160f6e` |
| Commit hash（short） | `aad1895` |
| Push | `origin/cursor/top3-maxdd-capital-audit` — **成功**

---

## 関連

| ファイル | 役割 |
|----------|------|
| `src/services/aiStrategyService.ts` | `[CONCIERGE_OPENAI]` ログ |
| `docs/review/CONCIERGE_OPENAI_ROOTCAUSE_REPORT.md` | 先行調査 |
