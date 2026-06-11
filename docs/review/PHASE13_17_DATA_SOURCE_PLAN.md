# Phase13〜17 データソース段階実装 — 設計書

## 総合方針

| 原則 | 内容 |
|------|------|
| 既存機能保護 | Bursa Phase6〜12、AI分析、保有銘柄、材料分析、X/News/Reddit RSS を変更しない（拡張のみ） |
| 注文禁止 | 実注文・自動売買は実装しない |
| 推測禁止 | 取得不可時は「データ未取得」「API未設定」「対象外」のみ表示 |
| クラッシュ防止 | null / undefined / 空配列は正規化してから UI 表示 |
| 実装順 | 設計書 → 最小実装 → 実機検証 → レポート |

## 優先順位とフェーズ対応

| 優先 | Phase | 名称 | 状態 |
|------|-------|------|------|
| 1 | **13** | Earnings Call解析 | **本書 + 最小実装着手** |
| 2 | **14** | Analyst Consensus | **実装済（Phase14）** |
| 3 | 15 | Insider Trading | 設計のみ |
| 4 | 16 | 四季報相当データ | 設計のみ |
| 5 | 17 | SNS統合 | 設計のみ（Phase11 X/News/Reddit を拡張） |

---

## 最終AI分析 20項目（表示仕様）

| # | 項目 | Phase | データ源 |
|---|------|-------|----------|
| 1 | 銘柄名 | 既存 | Evidence |
| 2 | 現在株価 | 既存 | Quote |
| 3 | 保有株数 | 既存 | Portfolio |
| 4 | 評価額 | 既存 | Quote × shares |
| 5 | 含み損益 | 既存 | Portfolio |
| 6 | 総合判定 | 既存 | Material + ActionGuide |
| 7 | 確信度 | 既存 | RiskControl |
| 8 | Earnings Call評価 | **13** | Phase13 |
| 9 | Analyst Consensus評価 | 14 | 外部API |
| 10 | Insider売買評価 | 15 | KLSE + API |
| 11 | 四季報相当評価 | 16 | KLSE/Bursa |
| 12 | News評価 | 11/17 | News API |
| 13 | X評価 | 11/17 | X API |
| 14 | Reddit評価 | 11/17 | Reddit RSS/OAuth |
| 15 | ポジティブ材料 | 既存 | Phase11 |
| 16 | ネガティブ材料 | 既存 | Phase11 |
| 17 | リスク | 既存 | ActionGuide |
| 18 | 次に確認すべきポイント | 既存 | ActionGuide |
| 19 | AI推奨アクション | 既存 | ルールベース |
| 20 | 総合スコア 0〜100 | 既存 | Material score 変換 |

未実装 Phase（14〜16）は **「データ未取得」** を固定表示。対象外市場は **「対象外」**。

---

## アーキテクチャ

```
BursaMaterialContext
  └─ buildBursaPhase11Analysis()
       └─ analyzeOneStock()
            ├─ fetchAllMaterialSources()     ← Phase11（変更なし）
            └─ buildEarningsCallAnalysis()   ← Phase13 追加（オプション enrich）

formatMaterialAnalysisReport()
  └─ MaterialStockRow.earningsCallEvaluationJa

AiAssistantChat
  └─ buildConciergeEnhancedAnalysis()
       └─ ConciergeEnhancedAnalysisBlock（20項目）
```

### 型の置き場

| ファイル | 内容 |
|----------|------|
| `src/types/bursaEarningsCall.ts` | Phase13 ドメイン型 |
| `src/types/conciergeEnhancedAnalysis.ts` | AI分析 20項目 UI 型 |
| `src/types/bursaDisclosure.ts` | `BursaStockMaterialAnalysis.earningsCall?` |

### サービス

| ファイル | 内容 |
|----------|------|
| `src/services/bursa/bursaEarningsCallService.ts` | 取得・スコアリング・安全表示 |
| `src/services/bursa/bursaPhase13Analysis.ts` | Phase13 オーケストレータ |
| `src/services/buildConciergeEnhancedAnalysis.ts` | 20項目ビルダー拡張 |

---

## Phase13: Earnings Call解析

### 目的

決算説明会 transcript / summary 相当テキストを保存可能な構造で扱い、CEO/CFOトーン・guidance・Q&Aリスク・強気/弱気ワードをスコア化する。

### データ構造

```typescript
EarningsCallStoredRecord {
  stockCode, companyName, eventDate,
  transcriptExcerpt, summaryExcerpt,
  source: 'finnhub_api' | 'klse_financial_report' | 'klse_announcement' | 'none',
  fetchedAt
}

BursaEarningsCallAnalysis {
  availability: 'available' | 'unavailable' | 'api_not_configured' | 'not_applicable',
  availabilityLabelJa,
  record, toneScores, guidanceSummaryJa, qaRiskPointsJa[],
  displayJa: { managementTone, guidance, qaWatchpoints },
  evaluationJa,  // UI 1行要約
  overallScore   // -100..+100（Phase13ソース単体）
}
```

### 取得経路（優先順）

1. **Finnhub API**（`earningsApiKey` 設定時）— `/stock/earnings` 実績データ。transcript 未提供時は unavailable（モック禁止）。
2. **KLSE Financial Report HTML**（`fetchLiveExternal=true` かつ四半期 endDate あり）— `bursaForecastService` ガイダンス文抽出。
3. **KLSE 直近開示タイトル**（fixture / stock HTML）— 「quarterly results」「financial results」等の開示見出しを summary として保存。

### スコアリング（実テキストのみ）

| 要素 | 方法 |
|------|------|
| CEO/CFOトーン | 役職キーワード近傍 ± 強気/弱気語カウント → -100..+100 |
| Guidance | ガイダンス文抽出 + raise/cut/unchanged キーワード |
| Q&Aリスク | analyst/question/challenge/caution 等の警戒語 |
| 強気/弱気ワード | 既存 `bursaMaterialSentiment` パターン再利用 |

### UI 表示

- **材料分析タブ**: 銘柄カードに「Phase13 Earnings Call」セクション
- **AI分析結果**: 項目8「Earnings Call評価」+ 経営陣トーン / ガイダンス / Q&A警戒点
- 未取得: `データ未取得` / `API未設定`（推測文言なし）

### 検証

- `tests/unit/bursaPhase13.test.ts` — スコアリング・空入力・未取得
- `scripts/bursa-phase13-verify.ts` — KLSE fixture 4銘柄
- 実機: `MaterialAnalysisScreen` + Concierge チャット（別途 `PHASE13_EARNINGS_CALL_REPORT.md`）

---

## Phase14: Analyst Consensus（設計）

### 型（予定）

```typescript
AnalystConsensusSnapshot {
  epsEstimate, revenueEstimate, targetPrice,
  buyCount, holdCount, sellCount,
  actualEps?, actualRevenue?,
  beatMiss: 'beat' | 'miss' | 'inline' | 'unknown'
}
```

### 取得

- 外部 API（Finnhub `/stock/recommendation`, `/stock/price-target` 等）— **API未接続時モック禁止**
- Bursa 銘柄は `.KL` シンボル

### UI

- AI分析 項目9「Analyst Consensus評価」
- Beat/Miss 差分表示

---

## Phase15: Insider Trading（設計）

### 型（予定）

```typescript
InsiderTradeRecord {
  role: 'CEO' | 'CFO' | 'Director' | 'MajorShareholder',
  direction: 'buy' | 'sell',
  shares, amountMyr, tradeDate
}
```

### 取得

- 既存 `bursaShareholdersService`（KLSE substantial shareholding）を拡張
- 取引履歴 API が無い市場は **対象外/未取得**

### 評価ルール

- 複数役員買い / CEO・CFO買い → 高評価材料
- 大量売却 → 警戒材料

---

## Phase16: 四季報相当データ（設計）

### 統合項目

事業内容、財務推移、配当、自己資本比率、営業利益率、ROE、PER/PBR、コメント

### 取得範囲

- **Bursa**: KLSE/Bursa 既存 Phase1〜4 パーサーから取得可能な範囲に限定
- **日本株**: 四季報本体は著作権・有料ライセンス前提。アプリ内に無断複製しない

---

## Phase17: SNS統合（設計）

### 方針

Phase11 の X / Reddit / News を **補助材料** として統合強化（最終判断に使わない）。

| 強化 | 内容 |
|------|------|
| ノイズ除外 | 既存 Reddit RSS quality + 新キーワードフィルタ |
| 銘柄一致 | symbol / companyName / 別名マッチ |
| 投資関連判定 | dividend, earnings, profit 等 |

### 総合スコア

Phase13〜17 ソースは Phase11 material score に **小さな重み** で将来統合（Phase13 単体 score は参考表示のみ）。

---

## 非機能要件

| 項目 | 対策 |
|------|------|
| undefined クラッシュ | `bursaPayloadNormalize` パターン、`?? []` / `?? null` |
| API タイムアウト | 10s、catch して diagnostics 返却 |
| 後方互換 | 新フィールドはすべて optional |
| テスト | vitest unit + verify script |
| ドキュメント | `docs/review/PHASE{N}_*_REPORT.md` |

---

## 実装ロードマップ

| 順 | タスク | 成果物 |
|----|--------|--------|
| 1 | 本設計書 | `PHASE13_17_DATA_SOURCE_PLAN.md` |
| 2 | Phase13 最小実装 | types, service, phase11 hook, UI |
| 3 | Phase13 単体テスト | `bursaPhase13.test.ts` |
| 4 | Phase13 verify | `bursa-phase13-verify.ts` |
| 5 | 実機検証 | `PHASE13_EARNINGS_CALL_REPORT.md` |
| 6 | Phase14〜17 | 順次、各 Phase ごとに同パターン |

---

## 変更ファイル一覧（Phase13）

| 操作 | パス |
|------|------|
| 新規 | `src/types/bursaEarningsCall.ts` |
| 新規 | `src/services/bursa/bursaEarningsCallService.ts` |
| 新規 | `src/services/bursa/bursaPhase13Analysis.ts` |
| 新規 | `tests/unit/bursaPhase13.test.ts` |
| 新規 | `scripts/bursa-phase13-verify.ts` |
| 変更 | `src/types/bursaDisclosure.ts` |
| 変更 | `src/types/conciergeEnhancedAnalysis.ts` |
| 変更 | `src/services/bursa/bursaPhase11Analysis.ts` |
| 変更 | `src/services/bursa/bursaMaterialAnalysisService.ts` |
| 変更 | `src/services/buildConciergeEnhancedAnalysis.ts` |
| 変更 | `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx` |
| 変更 | `src/screens/MaterialAnalysisScreen.tsx` |
