# CONCIERGE_EVIDENCE_FIX_REPORT

## 概要

Concierge assistant メッセージに `evidenceData` が付与されず `hasEvidence=false` となる不具合を修正した。OpenAI 成功時・モックフォールバック時の双方で Enhanced Analysis 用データをメッセージへマージする。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 対象 APK | versionCode **17** · `artifacts/preview-v17-local.apk` |

---

## 根本原因

| 現象 | 原因 |
|------|------|
| `evidence_undefined` on `msg.evidenceData` | `sendAiStrategyMessage` は `evidenceData` を返すが、チャット履歴ロード・ストリーミング経路でメッセージオブジェクトへマージが欠落するケース |
| 旧履歴メッセージ `a-1781873613711` 等 | AsyncStorage 復元メッセージは evidence なし（設計上）— 再描画のたびに `hasEvidence:false` ログ |
| `buildConciergeEnhancedAnalysis` 不表示 | `msg.evidenceData.symbols[0]` **かつ** `actionGuide.symbols[0]` 必須 |

`withContextArtifacts` / AppContext マージは設計上正しいが、UI 側で **確実に付与**する防御層が不足していた。

---

## 実装

### 1. `conciergeEvidenceCache.ts`（新規）

- `setLastConciergeTurnEvidence(bundle)` — コンテキスト構築直後に保存
- `getLastConciergeTurnEvidence()` — メッセージ組み立て時のフォールバック

### 2. `AppContext.tsx`

- `buildConciergeChatContext` 完了後 `setLastConciergeTurnEvidence(evidenceData)`

### 3. `AiAssistantChat.tsx`

| 変更 | 内容 |
|------|------|
| `mergeEvidenceOntoMessage` | result / cache から `symbols` · `actionGuide` · `riskControl` をマージ |
| `resultToMessage` | `evidenceFallback` + cache フォールバック |
| `appendAssistant` | `lastTurnEvidence` で enriched メッセージを補完 |
| catch / finally | モック応答にも `mergeEvidenceOntoMessage` 適用 |
| `historyHydratedRef` | 履歴ロードが進行中メッセージを上書きしないようガード |

---

## 検証（修正後 APK · logcat）

メッセージ ID `a-1781877808180`（Maybank 新規ターン）:

| `[EVIDENCE_TRACE]` stage | hasEvidence | symbol |
|--------------------------|-------------|--------|
| `context_built` | **true** | `1155.KL` |
| `strategy_result` | **true** | `1155.KL` |
| `result_to_message` | **true** | `1155.KL` |
| `append_assistant` | **true** | `1155.KL` |
| `message_in_state` | **true** | `1155.KL` |

証跡: `docs/review/concierge-enhanced-final/logcat-run-1.txt`

---

## 判定

| 項目 | 結果 |
|------|------|
| evidenceData マージ | **PASS** |
| `symbols[0]` | **PASS** — `1155.KL` |
| `actionGuide.symbols[0]` | **PASS**（bundle 構築時に同梱） |
| 旧履歴メッセージ | evidence なしは **想定内**（welcome / 過去ターン） |

---

## 制限事項

- 既存 AsyncStorage 履歴の assistant メッセージは evidence 非保存のまま。新規ターンから付与される。
- チャット履歴クリアまたは新規セッションで Enhanced Analysis が最も安定して表示される。

---

## Git

| 項目 | 値 |
|------|-----|
| 変更ファイル | `conciergeEvidenceCache.ts` · `AppContext.tsx` · `AiAssistantChat.tsx` |
| Commit hash（full） | `aad1895b911531c582027a36d4a4f22ef4160f6e` |
| Commit hash（short） | `aad1895` |
| Push | `origin/cursor/top3-maxdd-capital-audit` — **成功**
