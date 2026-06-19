# OPENAI_KEY_VALIDATION_REPORT

## 概要

v16 実機（`FYRWXSNNAIOR9DCM`）の **設定画面** から OpenAI API 接続テストを実行し、キー保存状態と接続結果を記録した。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| 対象 APK | versionCode **16**（インストール済み） |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| Git commit | `a12eaf89164337cd1651f4f55704f7637d48fd43` (`a12eaf8`) |
| 自動化 | `scripts/openai-key-validation-device.mjs` |
| 証跡 | `docs/review/openai-key-validation/` |

---

## 質問への回答

### 1. キー保存状態

| 項目 | 値 |
|------|-----|
| 保存状態（テスト前） | **設定済み**（`sk-proj-dCj9K2DoXzLqnKRJ_****IlkA` マスク表示） |
| 保存状態（テスト後） | **設定済み**（同一マスク） |
| 接続状態（テスト前） | **未テスト** |
| 接続状態（テスト後） | **成功** |
| `[API_KEY_LOAD]` | `exists:true` · `length:164` |

→ 端末 SecureStore に OpenAI キーは **保存済み**。テスト前は未確認だったが、接続テスト後 **成功** に更新。

### 2. 接続テスト結果

| 判定 | 結果 |
|------|------|
| UI 接続テスト | **PASS** — 接続状態「成功」 |
| 接続テストボタン | タップ成功 |

### 3. HTTP status

| ソース | HTTP status |
|--------|-------------|
| logcat `[openai-test]` | **未取得** — バッファに ReactNativeJS 行が残存せず |
| UI 結果 | **成功**（`testOpenAiResponsesConnection` が 200 + parse 成功時の表示） |
| 推定 | **200**（成功表示と整合） |

`secureLog('[openai-test]')` は release ビルドで logcat に出ない場合がある。UI「成功」は `outcome === 'success' && parseSuccess` 時のみ。

### 4. レスポンス body 要約

| 項目 | 値 |
|------|-----|
| エンドポイント | OpenAI **Responses API**（`AI_API_CHAT_URL`） |
| 入力 | `接続テスト: ping` |
| `max_output_tokens` | 32 |
| 期待応答 | `output_text` あり（`pingSummaryJa: output_text OK`） |
| logcat 詳細 | 今回 **未取得** |

### 5. モデル利用可否

| 項目 | 値 |
|------|-----|
| 設定モデル | **`gpt-4o-mini`**（`AI_API_MODEL`） |
| 接続テスト | **利用可**（同一モデルで ping 成功） |
| キー種別 | `sk-proj-...`（プロジェクトキー） |

---

## 判定

| 項目 | 結果 |
|------|------|
| キー保存 | **OK** |
| 接続テスト PASS | **OK** |
| HTTP 401 | **今回未観測**（設定 ping は成功） |
| Concierge 本番呼び出し | **別経路** — 巨大プロンプト・別タイムアウト。本レポートは設定画面検証のみ |

---

## 所見

- 先行調査の「APIキー保存済み・未確認」は、**接続テスト未実行**が原因。本実行で **成功** に更新。
- Concierge の Maybank 失敗（401/ネットワーク推定）と矛盾する場合、**キーは有効だが本番リクエスト側**（プロンプトサイズ・レート・別エラー）を Step 3 で再確認する。

---

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/services/openAiConnectionTest.ts` | `testOpenAiResponsesConnection` |
| `src/services/apiHealth.ts` | 設定画面「接続テスト」 |
| `scripts/openai-key-validation-device.mjs` | 実機自動検証 |

---

## Git

| 項目 | 値 |
|------|-----|
| Commit hash（full） | `a12eaf89164337cd1651f4f55704f7637d48fd43` |
| Commit hash（short） | `a12eaf8` |
| Message | `docs(concierge): add rootcause logcat evidence and update commit refs` |
| Push | `origin/cursor/top3-maxdd-capital-audit` — 検証時点で既 push 済 · 最終 `aad1895` |
