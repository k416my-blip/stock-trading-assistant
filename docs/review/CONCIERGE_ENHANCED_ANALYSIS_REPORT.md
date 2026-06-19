# CONCIERGE_ENHANCED_ANALYSIS_REPORT

## 概要

versionCode **16** 実機 APK（OpenAI API キー保存済み前提）にて、Concierge Enhanced Analysis（`AI分析結果`）の再検証を実施。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM`（23090RA98G / HyperOS） |
| APK | versionCode **16** / versionName **1.0.0** |
| Git commit（レポート提出） | `8e623ac` |
| Git HEAD（検証実施時） | `5a6905919e0e3ab24122996f86b2d6f99494fca8`（`5a69059`） |
| APK ビルド commit（既知） | `9dda7c797fbc519a9128448b690de5a63e21ada9`（`9dda7c7`） |
| 実行時間 | 約 **22.7 分**（材料分析待機 + 2 プロンプト × 最大 5 分待機） |
| 自動化スクリプト | `scripts/bursa-v16-concierge-enhanced-revalidation.mjs` |

---

## 結果サマリー

| 項目 | 結果 |
|------|------|
| **AI分析結果** | **FAIL** |
| **OpenAI通信** | **FAIL** |
| **Phase24統合（Concierge 内）** | **FAIL** |
| **Phase23.1統合（Concierge 内）** | **FAIL** |
| Concierge FAB（`AIコンシェルジュを開く`） | **PASS** |
| 材料分析タブ読込 | **PASS** |
| クラッシュ / FATAL / ANR | **なし** |

**総合判定:** **FAIL**（Enhanced Analysis 未生成・OpenAI 応答未取得）

---

## 前提確認（OpenAI API キー）

| 項目 | 結果 |
|------|------|
| 設定画面スクショ自動取得 | 未達（設定タブ未到達・材料分析画面を誤キャプチャ） |
| Concierge UI ステータス | **`API接続: APIキー保存済み・未確認`** を確認（Maybank プロンプト応答待機中 UI） |

→ ユーザー前提どおり **キーは端末に保存済み**。ただし OpenAI 応答は成功せず **モック応答へフォールバック**。

---

## プロンプト別結果

### 1. `1155を分析`

| 項目 | 結果 |
|------|------|
| 送信方法 | composer（クリップボード / テキスト入力） |
| UI 上のユーザーメッセージ | **未確認**（composer にプレースホルダのまま） |
| `AI分析結果` | **未検出**（5 分ポーリング + 35 scroll） |
| Phase24 / Phase23.1（Concierge） | **未検出** |
| OpenAI リクエスト（logcat） | **未検出**（当該ウィンドウ内） |
| UI 状態 | **`戦略バンドルを読み込み中…`** が継続（AI Action Center） |
| `[CONCIERGE_SHORT_ANSWER]` | `hasEvidence: false`, `symbol: null` |

**所見:** 1155 プロンプトは分析フローまで到達せず。戦略バンドル読込が完了しないまま待機が終了した可能性が高い。

### 2. `Maybankを分析`

| 項目 | 結果 |
|------|------|
| 送信方法 | composer（`Maybank` 入力確認） |
| UI 上のユーザーメッセージ | **`Maybank`** 表示 |
| `AI分析結果` | **未検出**（5 分ポーリング + 35 scroll） |
| Phase24 / Phase23.1（Concierge） | **未検出** |
| OpenAI リクエスト | **検出（1 回）** |
| OpenAI レスポンス | **未検出**（`openai_response` / `api parse ok` なし） |
| UI フォールバック | **`モック応答に切替中`** |
| `[CONCIERGE_SHORT_ANSWER]` | `hasEvidence: false`, `symbol: null` |
| 銘柄解決 | `1155.KL` / Malayan Banking Berhad |

**所見:** エビデンス構築（シンボル解決・株価/News 取得）は部分成功。OpenAI 呼び出しは開始されたが **有効応答なし → モック**。`buildConciergeEnhancedAnalysis` は `evidence.symbols[0]` + `actionGuide.symbols[0]` が必要なため **`AI分析結果` ブロックは描画されず** `ConciergeShortAnswerBlock` 側に留まる。

---

## OpenAI 通信詳細（Maybank プロンプト）

### リクエスト（logcat `[CONCIERGE_OPENAI]`）

```json
{
  "instructionsChars": 950,
  "userPayloadChars": 22947,
  "totalPromptChars": 23897,
  "maxOutputTokens": 480,
  "model": "gpt-4o-mini"
}
```

- エンドポイント: `https://api.openai.com/v1/responses`（コード定義）
- タイムアウト設定: **30 秒**（`AI_API_TIMEOUT_MS`）

### レスポンス

| 項目 | 値 |
|------|-----|
| `openai_response` / `api parse ok` | **なし** |
| HTTP 401 / 429（ReactNativeJS 明示ログ） | **なし**（当該ウィンドウ） |
| タイムアウト痕跡 | **あり**（システム logcat 全体に timeout 文字列；RN 側 explicit timeout ログは未取得） |
| UI 結果 | **モック応答に切替中** |

### エラー / ゲート判定

| 項目 | 結果 |
|------|------|
| **gate判定（AI Input Gate）** | **OPEN**（UI・logcat ともに「閉鎖」未検出） |
| `AI Input Gate 閉鎖` UI | **なし** |
| `[CONCIERGE_SHORT_ANSWER] hasEvidence` | **false**（Enhanced 描画条件未充足） |
| 明示的 API キー未設定 UI | **なし** |

### 補助 logcat（銘柄取得）

`[CONCIERGE_TARGET_SYMBOL]` — input: `Maybank` → `1155.KL`

`[CONCIERGE_SYMBOL_FETCH]` — `twelve_ok: true`, `yahoo_ok: true`, `news_ok: true`（newsapi）, `x_ok: false`, `confidenceScore: 63`

---

## Phase24 / Phase23.1 統合（Concierge 結果内）

| マーカー | 1155 | Maybank |
|----------|------|---------|
| `AI分析結果` | ✗ | ✗ |
| `Analyst Consensus Intelligence (Phase24)` | ✗ | ✗ |
| `Phase23.1 Cross Signal` | ✗ | ✗ |
| Phase24 マーカー（6 項目中） | 0 | 0 |
| Phase23.1 マーカー（5 項目中） | 0 | 0 |

**参考:** 材料分析タブ本体では Phase24 / Phase23.1 セクションは **読込済み**（同一セッション `materialLoaded: true`）。Concierge チャット内への統合のみ **未達**。

---

## コード上の Enhanced 表示条件（参考）

`ConciergeEnhancedAnalysisBlock`（`AI分析結果`）は `buildConciergeEnhancedAnalysis()` が non-null を返す場合のみ描画。

```319:327:src/services/buildConciergeEnhancedAnalysis.ts
export function buildConciergeEnhancedAnalysis(input: {
  evidence: ConciergeEvidenceBundle | undefined;
  structured?: AiChatStructuredReply;
  fallbackText?: string;
  materialRow?: MaterialStockRow | null;
}): ConciergeEnhancedAnalysisReport | null {
  const sym = input.evidence?.symbols[0];
  const guide = input.evidence?.actionGuide.symbols[0];
  if (!sym || !guide) return null;
```

今回 `hasEvidence: false` のため Enhanced ブロック未到達は **実装どおりの挙動**。

---

## 安定性

| 項目 | 値 |
|------|-----|
| FATAL（前） | 0 |
| FATAL（後） | 0 |
| ANR | なし |

---

## 証跡

### スクリーンショット

| ファイル | 内容 |
|----------|------|
| `docs/review/concierge-enhanced-revalidation/01-material-tab.png` | 材料分析タブ |
| `docs/review/concierge-enhanced-revalidation/02-material-loaded.png` | 材料分析読込完了 |
| `docs/review/concierge-enhanced-revalidation/03-concierge-open.png` | Concierge パネル OPEN |
| `docs/review/concierge-enhanced-revalidation/prompt-1155-sent.png` | 1155 送信直後 |
| `docs/review/concierge-enhanced-revalidation/prompt-1155-result.png` | 1155 待機終了（戦略バンドル読込中） |
| `docs/review/concierge-enhanced-revalidation/prompt-maybank-sent.png` | Maybank 送信直後 |
| `docs/review/concierge-enhanced-revalidation/prompt-maybank-result.png` | Maybank 待機終了 |

### データ

| ファイル | 内容 |
|----------|------|
| `docs/review/concierge-enhanced-revalidation/revalidation-results.json` | 機械可読サマリー（全フィールド） |
| `docs/review/concierge-enhanced-revalidation/logcat-1155.txt` | 1155 プロンプト window logcat |
| `docs/review/concierge-enhanced-revalidation/logcat-maybank.txt` | Maybank プロンプト window logcat |
| `docs/review/concierge-enhanced-revalidation/enh-maybank-poll-*.xml` | Maybank 応答待機 UI dump |
| `docs/review/concierge-enhanced-revalidation/enh-1155-poll-*.xml` | 1155 応答待機 UI dump |

---

## 根本原因（推定）

1. **OpenAI 応答未取得** — Maybank 分析で `[CONCIERGE_OPENAI]` 送信後、`openai_response` 未到達。UI は **モック応答に切替中**。
2. **evidence 未構築** — `[CONCIERGE_SHORT_ANSWER] hasEvidence: false` により `AI分析結果` ブロック条件未充足。
3. **1155 プロンプト未完了** — 戦略バンドル読込が完了せず、OpenAI リクエスト自体が発火しなかった可能性。
4. **AI Input Gate は原因ではない** — Gate 閉鎖は未検出。

---

## 推奨フォローアップ

1. Maybank 手動再現時、Concierge 内 **`モック応答に切替中`** の直後 logcat（`ReactNativeJS` / `[ai-strategy]`）を 60 秒分保存し、timeout / http エラーを特定。
2. 1155 送信前に **戦略バンドル読込完了**（AI Action Center のスピナー解消）を待ってからプロンプト送信。
3. OpenAI 30 秒タイムアウト vs 23KB ペイロード — 分析モード `maxOutputTokens: 720` 到達前に network timeout していないか確認。
4. 成功時は Concierge スクロール内 **`AI分析結果`** → **`9-A. Analyst Consensus Intelligence (Phase24)`** → **`Phase23.1 Cross Signal`** の 3 段を目視確認。

---

## 関連レポート

- 前回 Concierge UI 再検証: `docs/review/CONCIERGE_UI_REVALIDATION_REPORT.md`
- v16 focused JSON: `docs/review/v16-ui-revalidation/revalidation-results-focused.json`
