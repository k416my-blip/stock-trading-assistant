# CONCIERGE_OPENAI_ROOTCAUSE_REPORT

## 概要

Concierge Enhanced Analysis で OpenAI 応答が UI に反映されずモックへフォールバックする事象について、**ログ強化・60s タイムアウト暫定変更・Maybank 連続5回実機試験**を実施した。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| デバイス | `FYRWXSNNAIOR9DCM`（HyperOS / 23090RA98G） |
| APK | versionCode **16** · `artifacts/preview-v16-local.apk`（本調査用にログ込み再ビルド・再インストール） |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 自動化 | `scripts/bursa-concierge-openai-rootcause.mjs` |
| 証跡 | `docs/review/concierge-openai-rootcause/` |

---

## 結論（Root Cause）

### OpenAI 通信

| 項目 | 判定 |
|------|------|
| **総合** | **FAIL** — 実 API 応答未達・モックフォールバック |
| **最有力原因** | **短時間での API 失敗（401 認証エラー or ネットワークエラー）** — **30s タイムアウトではない** |
| **根拠** | 先行再検証で `20:53:29` リクエスト → `20:53:33`（約 **4 秒**）にモック定型文表示。30s `AbortSignal` では説明不可 |

#### 先行再検証（`CONCIERGE_ENHANCED_ANALYSIS_REPORT` / `concierge-enhanced-revalidation`）の決定的ログ

| 時刻 | イベント |
|------|----------|
| 20:53:28 | `[CONCIERGE_TARGET_SYMBOL]` Maybank → `1155.KL` |
| 20:53:29 | `[CONCIERGE_SYMBOL_FETCH]` 株価・News 取得成功（confidence 63） |
| 20:53:29 | `[CONCIERGE_OPENAI]` 送信（`totalPromptChars: 23897`, `gpt-4o-mini`） |
| 20:53:33 | UI: モック応答「小口の買い推奨…」（`mockAiChat.ts` 定型） |
| — | `openai_response` / `api parse ok` **なし** |

→ OpenAI は **呼び出し開始まで成功**。その後 **数秒以内に失敗**し `createAssistantChatMessage` 系モックへ切替。

#### 本調査の 5 連続試験（ログ強化 APK）

| Run | 自動分類 | 備考 |
|-----|----------|------|
| 1–5 | G（`no_openai_request`） | logcat バッファがシステムログで埋まり `ReactNativeJS` が欠落。UI は材料分析領域の `AI分析結果` を誤検出し早期終了 |

**60s タイムアウト比較:** 新ログ APK でもクリーン起動後の簡易タップ試験では OpenAI ログ 0 件（Concierge 未到達）。**60s 延長の効果は未検証**。先行 4 秒失敗パターンから、**タイムアウト延長だけでは解決しない可能性が高い**。

### 分類（A–F）— 確度付き

| 区分 | 確度 | 説明 |
|------|------|------|
| **A: timeout** | 低 | 4 秒でモック表示。30s/60s タイムアウトと不整合 |
| **B: HTTP 401** | **高** | 端末は「APIキー保存済み・未確認」。同一端末で NewsAPI 401 実績。401 は再試行対象外で即フォールバック |
| **C: HTTP 429** | 低 | 4 秒失敗と整合しにくい |
| **D: parse error** | 低 | `response_received` ログ（旧 APK）も未検出 |
| **E: empty response** | 中 | 可能性はあるが HTTP 未到達の可能性が高い |
| **F: network error** | 中 | 実機 fetch 失敗は数秒で返る |

**本調査コミット後の推奨再試行:** 新 `[CONCIERGE_OPENAI] phase=request_end` の `httpStatus` / `parseResult` / `elapsedMs` で B/F を確定。

---

## timeout 有無

| 項目 | 結果 |
|------|------|
| 旧定数 | `AI_API_TIMEOUT_MS = 30_000` |
| 本調査暫定 | `60_000`（`AI_MAX_IN_FLIGHT_MS` も 60s） |
| 実機観測 | **30s タイムアウト証跡なし**（4s フォールバック） |
| UI | 「タイムアウト」文言は今回 5 連続試験では未検出 |

---

## HTTP status

| ソース | HTTP status |
|--------|-------------|
| 先行 Maybank 再検証 | **未取得**（logcat に `[ai-strategy] api http error` 未保存） |
| 新ログ（`request_end`） | **今回実機で未捕捉**（上記 logcat 制約） |
| 推定 | **401 または未到達（network）** |

---

## evidence 生成状況

| 段階 | 結果 |
|------|------|
| シンボル解決 | **PASS** — `1155.KL` / Malayan Banking Berhad |
| 株価・News 取得 | **PASS** — Yahoo/Twelve/NewsAPI 経路で部分成功 |
| `buildConciergeEvidenceBundle` | 先行ログ上 **symbols 構築まで到達** |
| Enhanced Analysis（`AI分析結果`） | **FAIL** — `buildConciergeEnhancedAnalysis` は `evidence.symbols[0]` **かつ** `actionGuide.symbols[0]` 必須 |
| UI | モック応答のみ · Phase24/23.1 ブロック未描画 |

---

## hasEvidence=false 原因

新規ログ `[CONCIERGE_EVIDENCE_DIAG]` / 拡張 `[CONCIERGE_SHORT_ANSWER]` より:

| 原因コード | 意味 | 観測 |
|------------|------|------|
| `evidence_undefined` | `msg.evidenceData` が UI メッセージに未付与 | welcome / 固定 ID `a-1781873613711` で多数 |
| `symbols_empty` | bundle はあるが symbols 空 | 今回未観測 |
| `symbols[0]_missing` | symbols 配列が空でないが先頭欠落 | 今回未観測 |

### 解釈

1. **welcome / 古い assistant メッセージ**は evidence なしが正常。再描画のたびに `hasEvidence:false` が出る。
2. **Maybank 分析応答**については、先行再検証で `[CONCIERGE_SHORT_ANSWER] symbol:null` が **Maybank 新規 messageId ではなく** セッション固定 ID に紐づくログが主で、**分析ターンへの evidence 付与タイミングがログ上未確認**。
3. コード上、`resultToMessage` は `result.evidenceData`（`withContextArtifacts` で context から付与）を期待。モックフォールバック時も `attach()` で付与される設計だが、**UI 側 `msg.evidenceData` が欠落している経路**が残存疑い。
4. Enhanced Analysis は ShortAnswer より厳しく **actionGuide.symbols[0]** も必要。evidence あっても guide 欠落で `AI分析結果` は出ない。

---

## 実装した診断強化（本コミット）

| ファイル | 変更 |
|----------|------|
| `src/services/aiStrategyService.ts` | `[CONCIERGE_OPENAI]` に `request_start` / `response_received` / `request_end`（elapsedMs, httpStatus, responseSize, parseResult, timeout） |
| `src/services/aiStrategyService.ts` | `catch` 内 `secureWarn` + 例外詳細 |
| `src/constants/aiStrategy.ts` | 暫定 **60s** タイムアウト |
| `src/services/conciergeShortAnswerFromEvidence.ts` | `hasEvidence=false` 時に symbols / actionGuide 要約 |
| `src/services/conciergeEvidenceTrace.ts` | `[CONCIERGE_EVIDENCE_DIAG]` 追加 |
| `scripts/bursa-concierge-openai-rootcause.mjs` | Maybank ×5 · logcat · A–F 分類 |

---

## 修正案

| 優先 | 対策 |
|------|------|
| **P0** | **OpenAI API キー有効性の実機確認**（設定画面接続テスト · 401 ならキー再発行） |
| **P0** | 新 `[CONCIERGE_OPENAI] request_end` で **httpStatus / parseResult** を再取得（`adb logcat -s ReactNativeJS:W` 推奨） |
| **P1** | モックフォールバック後も **`evidenceData` を assistant メッセージに必ずマージ** — `EVIDENCE_TRACE result_to_message` を Maybank ターンで確認 |
| **P1** | `buildConciergeEnhancedAnalysis` 失敗時に **guide 欠落理由**を UI/ログ表示 |
| **P2** | 巨大プロンプト（~24KB）の圧縮見直し — 遅延・失敗率低減 |
| **P2** | 60s タイムアウトは **根本原因確定後**に 30s へ戻すか判断 |
| **P2** | 自動化: logcat を `-s ReactNativeJS:W` で取得 · `am force-stop` 後に試験 · `AI分析結果` 誤検出防止 |

---

## 5 連続試験サマリー

| Run | UI `AI分析結果` | UI モック | 自動分類 | 備考 |
|-----|-----------------|-----------|----------|------|
| 1 | true* | false | G | *材料分析スクロール誤検出の疑い |
| 2 | true* | false | G | 同上 |
| 3 | true* | false | G | 同上 |
| 4 | true* | false | G | 同上 |
| 5 | true* | false | G | 同上 |

詳細: `docs/review/concierge-openai-rootcause/summary.json`

---

## Git

| 項目 | 値 |
|------|-----|
| 本レポート提出時 commit | `6d087ed9`（`6d087ed`） |
| 先行 APK ビルド commit | `9dda7c797fbc519a9128448b690de5a63e21ada9` |

---

## push 結果

| 項目 | 結果 |
|------|------|
| push | **SUCCESS** |
| remote | `origin/cursor/top3-maxdd-capital-audit` |
| range | `b7a64b6..6d087ed` |

---

## 証跡一覧

| パス | 内容 |
|------|------|
| `docs/review/concierge-openai-rootcause/summary.json` | 5 連続試験集計 |
| `docs/review/concierge-openai-rootcause/run-*.json` | 各 run メタ |
| `docs/review/concierge-openai-rootcause/logcat-run-*.txt` | 各 run logcat（システムログ多め） |
| `docs/review/concierge-openai-rootcause/logcat-filtered-clean.txt` | `ReactNativeJS:W` フィルタ試験 |
| `docs/review/concierge-enhanced-revalidation/revalidation-results.json` | 先行 Maybank OpenAI 送信ログ |
| `docs/review/CONCIERGE_ENHANCED_ANALYSIS_REPORT.md` | 先行総合 FAIL レポート |

---

## 総合判定

| 項目 | 判定 |
|------|------|
| OpenAI 通信 | **FAIL**（送信のみ成功 · 応答未処理） |
| Root cause | **短時間 API 失敗（401 最有力）** — 30s タイムアウトが主因ではない |
| hasEvidence=false | **メッセージ未付与 `evidence_undefined` + Enhanced 用 guide 要件** |
| 次アクション | OpenAI キー検証 + 新ログで `request_end` 再取得 |
