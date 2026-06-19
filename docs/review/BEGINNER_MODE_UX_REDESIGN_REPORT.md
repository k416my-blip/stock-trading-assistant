# BEGINNER_MODE_UX_REDESIGN_REPORT

## 概要

投資初心者が **5 秒で理解できる UI** へ向けた設計監査。Phase13〜24 の専門表示を初心者モードで隠し、5 項目サマリーに集約する。

| 項目 | 値 |
|------|-----|
| 監査日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 監査ベースコミット | `b68f8d6` |
| レポート提出コミット | `1b2fc7f` |
| スコープ | **設計監査のみ**（実装なし） |
| ステータス | **UX0 設計監査 · 承認待ち** |

### 設計目標

| モード | デフォルト | 切替 |
|--------|------------|------|
| **初心者モード** | **ON** | — |
| **上級者モード** | OFF | 設定画面 |

**初心者モード表示（5 秒理解）:** おすすめ度 · AI判定 · 理由3行 · リスク3行 · 次のアクション  
**非表示:** Phase13〜24 詳細 · API 監査 · ソース内訳 · 英語 Phase 名

---

## 1. 現在 UI の問題点

### 1.1 情報過多（材料分析タブ）

`MaterialAnalysisScreen.tsx` の `StockMaterialCard` は **1 銘柄あたり 20+ Phase セクション** を縦に列挙。

| 問題 | 証拠 | 初心者への影響 |
|------|------|----------------|
| Phase 名が英語 · 番号付き | `Phase24 Analyst Consensus Intelligence` 等 18 見出し | 「何の画面か」即理解不可 |
| スクロール量が巨大 | 1 カード ≈ 400–600 行相当 | 5 秒理解 **不可能** |
| 技術メタデータ露出 | `itemCountBySource` · Reddit diagnostics · API 接続 | ノイズ · 不安増 |
| 判定が分散 | 各 Phase に個別 evaluation 文字列 | 総合判断が見えない |
| 英語フィールド混在 | Rating · Upside · Source · Confidence | 非英語話者に不親切 |

### 1.2 タブ過多

`MainTabNavigator` — **11 タブ**（Home · おすすめ配分 · スクリーナー · 保有 · AI資産運用 · 今日の売買 · 市場監視 · AI通知 · **材料分析** · 履歴 · 初心者ガイド）

初心者の主経路（保有 → 判断）は **3 タップ以上** · タブ名だけでは優先度が不明。

### 1.3 既存「初心者」機能の断片化

| 機能 | 場所 | 材料分析への適用 |
|------|------|------------------|
| `conciergeUxMode` beginner/advanced | `AiSettingsScreen` · デフォルト **beginner** | Concierge のみ · **材料分析未適用** |
| `ConciergeShortAnswerBlock` | Concierge チャット | 結論/理由/リスク/推奨 — **好モデル** |
| `investmentDisplayMode` trust/beginner/pro | AI 設定 · 配分 UI | 材料分析 **未連動** |
| `beginnerDisplayMapper.ts` | おすすめ配分カード | Phase 名変換 **なし** |

**ギャップ:** コンシェルジュは初心者向け short answer があるが、**材料分析・Enhanced Analysis は常に上級者 UI**。

### 1.4 Concierge Enhanced Analysis

`ConciergeEnhancedAnalysisBlock.tsx` — 15 項目 + Phase24/23.1 英語見出し。`uxMode` による分岐 **なし**。

### 1.5 5 秒理解チェック（現状）

| 画面 | 5 秒で「買う/待つ」判断可能か |
|------|------------------------------|
| 保有銘柄 | △（含み損益は見える） |
| 材料分析（1 銘柄） | **×** |
| Concierge（beginner） | **○**（ShortAnswer あり） |
| Concierge Enhanced | **×** |
| AI 設定 | ×（上級者向け項目多い） |

---

## 2. 設計方針

### 2.1 モード統合（案）

既存 `conciergeUxMode` を **アプリ全体 UX モード** に昇格、または新規 `appUxMode` を追加し Material Analysis / Enhanced Analysis に伝播。

```typescript
// 案: src/types/appUx.ts
export type AppUxMode = 'beginner' | 'advanced';

// aiPreferences.conciergeUxMode を AppUxMode として全画面で参照
// デフォルト: 'beginner'（現状維持 · aiPreferencesStorage.ts L24）
```

**設定 UI:** `SettingsScreen` に「表示モード」セクションを追加（`AiSettingsScreen` から移管または同期）。ラベル:

- 初心者モード（やさしい表示 · おすすめ）
- 上級者モード（Phase 詳細 · 監査ログ）

### 2.2 初心者 5 項目サマリー（データ Derive）

Phase13–24 の enricher 出力から **表示層のみ** 集約（判定ロジックは変更しない）。

| UI 項目 | データソース（集約案） | 表示例 |
|---------|------------------------|--------|
| **おすすめ度** | 材料スコア + hybrid fused action | ★★★★☆ / 「ややおすすめ」 |
| **AI判定** | `overallJudgmentJa` · adoption verdict | 「様子見」 |
| **理由3行** | top 3 positive/negative phase evaluations | 箇条書き最大 3 行 |
| **リスク3行** | warnings · macro risk · data gaps | 箇条書き最大 3 行 |
| **次のアクション** | actionGuide · ConciergeShortAnswer.actionJa | 「様子見 · 決算後に再確認」 |

**新規サービス（案）:** `src/services/beginnerMaterialSummaryBuilder.ts`

### 2.3 Phase 名 → 初心者向け名称

| Phase | 現行 UI ラベル | 初心者名称 |
|-------|----------------|------------|
| 13 | Phase13 Earnings Call | **決算説明会** |
| 14 | Phase14 Analyst Consensus | **アナリスト予想** |
| 15 | Phase15 Insider Trading | **内部者売買** |
| 16 | Phase16 Institutional Ownership | **大株主の動き** |
| 16.5 | Phase16.5 Institutional Trend | **機関投資家トレンド** |
| 16.6 | Phase16.6 Historical Ownership | **保有履歴** |
| 16.8 | Phase16.8 TOP30 Institution Basket | **主要機関ポートフォリオ** |
| 17 | Phase17 Dividend Intelligence | **配当** |
| 18 | Phase18 News Intelligence | **ニュース** |
| 19 | Phase19 Macro Intelligence | **景気** |
| 19.5 | Phase19.5 Sector Rotation | **業種の流れ** |
| 20 | Phase20 Valuation Intelligence | **株価の割安度** |
| 21 | Phase21 Fair Value Intelligence | **適正株価** |
| 22 | Phase22 Analyst Target Intelligence | **目標株価** |
| 22.1 | Phase22.1 Valuation Gap Intelligence | **目標との差** |
| 22.2 | Phase22.2 Conviction Intelligence | **自信度** |
| 23 | Phase23 Earnings Revision Intelligence | **業績修正** |
| 23.1 | Phase23.1 Earnings Revision Cross Signal | **業績シグナル** |
| 24 | Phase24 Analyst Consensus Intelligence | **専門家評価** |

**定数（案）:** `src/constants/phaseBeginnerLabelsJa.ts`

上級者モードでは現行 Phase 名を維持。初心者モードでは **Phase セクション自体を非表示**（名称変換は上級者折りたたみ · ツールチップ · 将来の「詳しく見る」で使用）。

---

## 3. 新 UI モック（ワイヤーフレーム）

### 3.1 初心者モード — 材料分析（銘柄カード）

```
┌─────────────────────────────────────────┐
│ 1155  Maybank                    ★★★★☆ │
│ おすすめ度: ややおすすめ                  │
├─────────────────────────────────────────┤
│ AI判定:  様子見                          │
├─────────────────────────────────────────┤
│ 理由                                     │
│  1. 配当が安定している                    │
│  2. 専門家評価は中立                      │
│  3. 景気は横ばい                          │
├─────────────────────────────────────────┤
│ リスク                                   │
│  1. 為替変動の影響                        │
│  2. ニュース材料が少ない                  │
│  3. データ更新が1日以上前                 │
├─────────────────────────────────────────┤
│ 次のアクション                            │
│  ▸ 決算発表後に再確認 · 急いで売買しない   │
├─────────────────────────────────────────┤
│ [詳しく見る（上級者表示）]  ← 任意 Phase2 │
└─────────────────────────────────────────┘
```

**画面全体（リスト）:**

```
┌─ 材料分析 ─────────────────────────────┐
│ あなたの銘柄 · やさしい表示              │
│ [更新]                                   │
├─────────────────────────────────────────┤
│ ┌─ 1155 Maybank ──────────── ★★★★☆ ─┐ │
│ │ AI判定: 様子見  ·  理由/リスク/次…   │ │
│ └─────────────────────────────────────┘ │
│ ┌─ 1023 CIMB ─────────────── ★★★☆☆ ─┐ │
│ │ …                                    │ │
│ └─────────────────────────────────────┘ │
│ （API接続 · Phase11.5監査 · 非表示）     │
└─────────────────────────────────────────┘
```

### 3.2 上級者モード — 材料分析（現行維持）

```
┌─ 材料分析 ─────────────────────────────┐
│ Live · [再取得]                          │
│ 【データ品質】 ★★★☆☆                    │
│ 【API接続状況】 News / X / Reddit        │
│ 【銘柄別材料分析】                       │
│ ┌─ 1155 ─────────────────────────────┐ │
│ │ 材料スコア内訳 · source別            │ │
│ │ Phase13 Earnings Call …            │ │
│ │ Phase14 Analyst Consensus …        │ │
│ │ … Phase24 … Phase23.1 …            │ │
│ └────────────────────────────────────┘ │
│ 【Phase11.5 API統合監査】               │
└─────────────────────────────────────────┘
```

### 3.3 初心者モード — Concierge（分析時）

```
┌─ AIコンシェルジュ ─────────────────────┐
│ Maybankについて                         │
├─────────────────────────────────────────┤
│ （OpenAI 主応答 · 短文）                 │
├─────────────────────────────────────────┤
│ ★ おすすめ度: ★★★★☆                     │
│ AI判定: 様子見                           │
│ 理由: …（最大3行）                       │
│ リスク: …（最大3行）                     │
│ 次: 決算後に再確認                       │
├─────────────────────────────────────────┤
│ （Enhanced 15項目 · Phase24 · 非表示）   │
│ （evidence パネル · 非表示）             │
└─────────────────────────────────────────┘
```

### 3.4 上級者モード — Concierge（現行 + Enhanced）

```
┌─ AIコンシェルジュ ─────────────────────┐
│ 構造化 JSON · テクニカル/マクロ理由      │
│ ▼ AI分析結果（15項目）                   │
│   9-A. Analyst Consensus Intelligence   │
│   Phase23.1 Cross Signal                │
│ ▼ 根拠・evidence                         │
└─────────────────────────────────────────┘
```

### 3.5 設定画面 — モード切替

```
┌─ 設定 ─────────────────────────────────┐
│ …                                       │
│ ── 表示モード ──                         │
│ ◉ 初心者モード（やさしい表示）            │
│ ○ 上級者モード（Phase詳細・監査）        │
│   材料分析の専門情報をすべて表示します    │
│ …                                       │
└─────────────────────────────────────────┘
```

---

## 4. コンポーネント設計（実装時）

| コンポーネント | 役割 |
|----------------|------|
| `BeginnerStockSummaryCard` | 材料分析 · 5 項目カード |
| `BeginnerEnhancedSummary` | Concierge Enhanced の簡略版 |
| `StockMaterialCardAdvanced` | 現行 `StockMaterialCard` リネーム |
| `MaterialAnalysisScreen` | `uxMode` で card 分岐 |
| `phaseBeginnerLabelsJa.ts` | Phase 名称マップ |
| `beginnerMaterialSummaryBuilder.ts` | Phase データ → 5 項目 |

**分岐パターン:**

```tsx
// MaterialAnalysisScreen.tsx（案）
const uxMode = aiPreferences.conciergeUxMode ?? 'beginner';

{report.stocks.map((row) =>
  uxMode === 'beginner' ? (
    <BeginnerStockSummaryCard key={row.stockCode} row={row} summary={buildBeginnerSummary(row)} />
  ) : (
    <StockMaterialCardAdvanced key={row.stockCode} row={row} onPress={...} />
  )
)}
```

---

## 5. 実装工数見積（設計監査 · 未着手）

| Phase | 内容 | 工数（人日） |
|-------|------|-------------|
| **UX0** | 本設計監査 | **0.5**（完了） |
| **UX1** | Phase 名称定数 · summary builder · unit test | 2 |
| **UX2** | `BeginnerStockSummaryCard` · MaterialAnalysis 分岐 | 2 |
| **UX3** | Concierge Enhanced 初心者サマリー · Enhanced 分岐 | 1.5 |
| **UX4** | Settings 表示モード UI 統合 · デフォルト beginner 確認 | 0.5 |
| **UX5** | 6 銘柄 device smoke · レポート | 1 |
| **UX6** | タブ簡素化（任意 · Phase2） | 2–3 |

| 合計（UX1–UX5 必須） | **約 7 人日** |
| 合計（UX6 含む） | **約 9–10 人日** |

**依存:** Play Internal Testing 完了後に UX1 着手を推奨（`PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` と並行設計のみ可）。

**リスク加算:** summary builder の理由/リスク抽出品質チューニング +1–2 人日。

---

## 6. リスク

| リスク | 影響 | 緩和 |
|--------|------|------|
| 5 項目への集約で情報欠落 | 上級者向け判断材料の隠蔽 | 上級者モードで全 Phase 復元 |
| 理由/リスクの自動抽出が浅い | 初心者誤解 | テンプレ + phase priority · 人手レビュー |
| `conciergeUxMode` 名称の混乱 | 材料分析と無関係に見える | Settings で「アプリ表示モード」に改名 |
| 2 モード保守コスト | バグ二重化 | 共有 data layer · 表示のみ分岐 |
| Play 審査 | 投資助言誤認 | 免責 · 「参考情報」ラベル維持 |

---

## 7. 成功基準（実装後）

| 項目 | 基準 |
|------|------|
| 5 秒理解 | 初心者 3 名ヒューリスティックで「買う/待つ/見送り」回答 ≤5 秒 |
| Phase 非表示 | 初心者モードで Phase13–24 見出し **0 件** |
| 5 項目表示 | 全保有銘柄カードに 5 項目 **非空**（データ欠落時は「データ不足」明示） |
| デフォルト | 新規インストール · `conciergeUxMode=beginner` |
| 上級者回帰 | advanced モードで現行 UI **ビット一致** |
| Phase 名称 | 上級者折りたたみで初心者名称ツールチップ（任意） |

---

## 8. 結論

| 項目 | 判定 |
|------|------|
| 現状 5 秒理解 | **不可**（材料分析 · Enhanced が主因） |
| 既存資産 | Concierge ShortAnswer · conciergeUxMode · beginnerDisplayMapper **再利用可** |
| 最大変更点 | `MaterialAnalysisScreen` の card 分岐 + summary builder |
| 推奨実装順 | UX1 → UX2 → UX4 → UX3 → UX5 |

**設計監査完了。** 実装は Play Internal Testing 優先サイクル後に UX1 から着手。

---

## 9. GitHub 同期結果

| 項目 | 値 |
|------|-----|
| 監査ベースコミット | `b68f8d6` |
| レポート提出コミット | `1b2fc7f` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| Push | **SUCCESS** |
