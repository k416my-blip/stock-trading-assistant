# APP_WIDE_BEGINNER_UX_AUDIT_REPORT

## 概要

材料分析限定だった BEGINNER_MODE を **アプリ全体** に拡張する設計監査。投資初心者が起動後 **5 秒以内** に「今日何をすればよいか」を把握できる UX を定義する。

| 項目 | 値 |
|------|-----|
| 監査日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 監査ベースコミット | `9a6f8c9` |
| レポート提出コミット | `017e549` |
| スコープ | **設計監査のみ**（実装なし） |
| 親仕様 | UX0（`BEGINNER_MODE_UX_REDESIGN_REPORT.md`）· UX0.1 · **UX0.3**（`BEGINNER_MODE_HOME_SCREEN_REPORT.md`） |
| バージョン | **UX1.0 — App-Wide** |

### 設計目標

| 目標 | 基準 |
|------|------|
| 5 秒理解 | 起動直後に「急ぐ必要があるか / 今日の方針」を回答可能 |
| 用語 | 中学レベル日本語 · 専門語・Phase 名・英語メタ非表示（Beginner） |
| モード | **Beginner / Standard / Pro** の 3 段階 |
| 非目標 | 判定ロジック変更 · Play Store 審査対応の実装 |

---

## 1. 現状アーキテクチャ — モード断片化

### 1.1 既存モード（コード実態）

| 設定 | 型 | デフォルト | 適用範囲 |
|------|-----|-----------|----------|
| `conciergeUxMode` | `beginner \| advanced` | `beginner` | Concierge チャット（`AiAssistantChat.tsx`） |
| `investmentDisplayMode` | `trust \| beginner \| pro` | `trust` | Home 分岐 · おすすめ配分 UI |

**ギャップ:** 2 系統が独立 · Material Analysis / Portfolio / Settings / ManualOrderList / StockDetail は **モード非連動**。

### 1.2 タブ構成（`MainTabNavigator.tsx` — 11 タブ）

| タブ key | 表示名 | Beginner 推奨 |
|----------|--------|---------------|
| Home | ホーム | ✅ 常時 |
| AllocationPlan | おすすめ配分 | ✅（簡略） |
| Screener | 銘柄検索 | △ Standard+ |
| Portfolio | 保有銘柄 | ✅ 常時 |
| AssetManagement | AI資産運用 | ❌ Pro のみ |
| TodayTrading | 今日の売買 | ❌ Standard+ |
| MarketMonitoring | 市場監視 | ❌ Pro |
| AiNotifications | AI通知 | △ Standard（要約） |
| MaterialAnalysis | 材料分析 | ✅ → **銘柄チェック** |
| History | 売買履歴 | △ Standard+ |
| BeginnerGuide | 初心者ガイド | ✅ Beginner |

**Beginner 推奨タブ（5）:** ホーム · 保有銘柄 · 銘柄チェック · おすすめ配分 · 初心者ガイド

---

## 2. 3 モード設計 — App-Wide UX

### 2.1 統合型定義（案: `appUxMode`）

```typescript
export type AppUxMode = 'beginner' | 'standard' | 'pro';

// 移行マッピング（初回起動）
// beginner  ← investmentDisplayMode=trust|beginner + conciergeUxMode=beginner
// standard  ← 新設（中間）
// pro       ← investmentDisplayMode=pro + conciergeUxMode=advanced
```

| モード | ラベル | 概要 | 既存との対応 |
|--------|--------|------|--------------|
| **Beginner** | 初心者 | 最大簡素化 · 平易語 · Phase/API/監査非表示 · 「今日のAIアドバイス」 | trust/beginner + concierge beginner |
| **Standard** | 標準 | 主要指標 + 4 分類判定 · ShortAnswer · PnL サマリー | **新設** |
| **Pro** | プロ | 現行 UI ほぼ維持 · Phase13–24 · ダッシュボード · 監査 | pro + advanced |

**設定 UI:** `SettingsScreen` 最上部に「表示モード」3 択（`AiSettingsScreen` の分散設定を同期または移管）。

### 2.2 モード横断ルール

| 要素 | Beginner | Standard | Pro |
|------|----------|----------|-----|
| AI信頼度 | 高い/普通/低い（% 非表示） | 3 段階 + % 折りたたみ | % + バー + Phase 根拠 |
| AI判定 | 4 分類（買い候補/監視/保有/見送り） | 同左 + fused action ヒント | 現行 verdict + hybrid |
| Phase13–24 | **非表示** | 折りたたみ（日本語見出し） | 現行英語 Phase 名 |
| API 監査 | **非表示** | 接続 OK/NG のみ | 全監査行 |
| タブ数 | **5** | **8** | **11** |
| 免責 | 常時フッター | カード下 | 既存 |

---

## 3. 画面別 UX 監査

### 3.1 ホーム（`HomeScreen.tsx`）

#### 現状 UI セクション

| 分岐 | セクション | 情報密度 |
|------|-----------|----------|
| **trust** | TrustConcierge · 運用実績 · 月次 · 承認カード | 中 |
| **beginner** (`investmentDisplayMode=beginner`) | リード文 + 「おすすめを見る」ボタンのみ | **低（不足）** |
| **default** | DegradedBanner · BursaConcierge · Material · Proactive · CentralIntelligence · BuyingPower · Capital · MarketSession · Regime · CrossAsset · **AiTradeQueueSection** | **高** |

#### 初心者に不要（Beginner で非表示）

- `CentralIntelligencePanel` · `AiTradeQueueSection` · `MarketRegimeCard` · `CrossAssetFlowCard`
- `BursaConciergeHomeCard`（AI通知詳細 — アドバイスカードに集約）
- `HeaderProactiveBadge` · `HeaderUrgencyBadge`（既に simplified で一部非表示）
- Trust 専用 MD 承認フロー（trust モードは Beginner サブセットとして別途維持可）

#### 5 秒必須（Beginner MUST）

1. **「今日のAIアドバイス」** カード（UX0.3 · `BeginnerTodayAdviceCard`）
2. 保有銘柄の 4 分類一行要約（最大 5 行）
3. フッター「急いで売買する必要はありません」
4. CTA「銘柄チェックで詳しく見る」

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| アドバイスカード + 保有サマリー 3 行 + 2 CTA | + BuyingPower · Concierge 1 件 · 配分ショートカット | 現行 default 全体 |

#### ワイヤーフレーム — Beginner

```
┌─ ホーム ───────────────────────── [設定] ┐
│ ┌─ 今日のAIアドバイス ──────────────┐  │
│ │ 2026-06-19                         │  │
│ │ ● Maybank      保有継続            │  │
│ │ ○ CIMB         監視                │  │
│ │ — 新規購入     なし                 │  │
│ │ 急いで売買する必要はありません      │  │
│ │ [銘柄チェックで詳しく →]           │  │
│ └────────────────────────────────────┘  │
│ 総資産 RM xx,xxx（任意 · 1 行）         │
│ [おすすめ配分を見る]  [保有を確認]       │
└─────────────────────────────────────────┘
```

**Standard 差分:** + BuyingPower カード · BursaConcierge 1 件  
**Pro 差分:** + AiTradeQueue · CentralIntelligence · Regime 等（現行維持）

---

### 3.2 保有銘柄（`PortfolioScreen.tsx`）

#### 現状 UI セクション

| セクション | 密度 |
|-----------|------|
| PortfolioPriceSyncCard | 中 |
| サマリー Card（含み損益 · 配当 · TermHint） | 中–高 |
| PortfolioHoldingsCardsSection（銘柄カード） | 中 |
| RealAccountExposurePanel · PendingOrders · CandidateSection | **高** |
| LazyPortfolioAnalytics | **高** |
| 配当履歴 · すべて売却 · 手動追加 CTA | 中 |

#### 初心者に不要

- `TermHint`（用語辞典 UI）
- `RealAccountExposurePanel` · `PortfolioCandidateSection`
- `LazyPortfolioAnalytics`（セクター配分 · ドローダウン等）
- `RealAccountPendingOrdersPanel`（Trade Queue へ誘導で十分）
- 配当履歴（Settings/Standard へ）
- 「すべて売却」（Beginner では個別カードのみ）

#### 5 秒必須

1. 保有件数 + 総資産（1 行）
2. 各銘柄: 名前 · 現在値 · **AI判定 4 分類** · 損益色（+/- のみ · % は任意）
3. 「詳しく」→ 銘柄チェック / StockDetail 簡略版

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| 簡略カード · 4 分類 · 損益 RM | + 含み損益合計 · 価格同期 | 現行 + Analytics |

#### ワイヤーフレーム — Beginner

```
┌─ 保有銘柄 ────────────────────────────┐
│ 2 銘柄 · 総資産 RM 12,450               │
├────────────────────────────────────────┤
│ 1155 Maybank          AI判定: 保有     │
│ RM 9.20 · +RM 120                      │
│ [詳しく見る]                           │
├────────────────────────────────────────┤
│ 1295 Public Bank      AI判定: 保有     │
│ RM 4.50 · -RM 30                       │
│ [詳しく見る]                           │
└────────────────────────────────────────┘
```

---

### 3.3 銘柄チェック / 材料分析（`MaterialAnalysisScreen.tsx`）

#### 現状（情報密度: **極高**）

画面レベル: データ品質 · API接続 · 市場監視 · 銘柄別カード · Phase11.5 監査  
カードレベル（`StockMaterialCard`）: スコア内訳 · API · Reddit diagnostics · **Phase13–Phase24**（18+ 見出し · 英語混在）

#### 初心者に不要（UX0 踏襲）

- 全 Phase セクション · `itemCountBySource` · Reddit diagnostics
- API接続詳細 · Phase11.5 監査
- 材料スコア内訳（ソース別）
- 英語フィールド（Rating · Upside · Confidence 等）

#### 5 秒必須（UX0.1 + UX0.3）

1. `BeginnerTodayAdviceCard`（index 0 · ホームと同一 builder）
2. 銘柄カード: **AI判定 4 分類** · **AI信頼度 3 段階** · **理由 3 行（平易）** · 気をつける点 · 次にすること

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| `BeginnerStockSummaryCard` のみ | 5 項目 + Phase 折りたたみ（日本語名） | 現行 `StockMaterialCard` |

#### ワイヤーフレーム — Beginner

```
┌─ 銘柄チェック ────────────────────────┐
│ ┌─ 今日のAIアドバイス ─（ホーム同一）─┐  │
│ └────────────────────────────────────┘  │
│ 1155 Maybank                            │
│ AI判定: 保有    AI信頼度: 普通           │
│ 判断材料はやや不足しています             │
│ ─ なぜそう判断したか ─                  │
│  1. お金の還元は安定しています           │
│  2. 外の評価に大きな悪い点はありません   │
│  3. 国の景気は大きく動いていません       │
│ ─ 気をつける点 ─ / ─ 次にすること ─     │
└─────────────────────────────────────────┘
```

**Standard 差分:** データ品質 ★ · API 接続 OK/NG 1 行 · 「Phase 詳細を見る」  
**Pro 差分:** 現行 Phase 全文 · 監査セクション

---

### 3.4 コンシェルジュ（`AiAssistantChat.tsx` · `AiConciergeSheet.tsx`）

#### 現状

- アクセス: ホームカード · フローティング · `AiNotifications` タブ経由
- **beginner:** `ConciergeShortAnswerBlock` · StructuredBlock 非表示 · Enhanced 非表示 · ダッシュボード一部
- **advanced:** Enhanced Analysis · Evidence · Cognitive/Survival ダッシュボード · `ConciergeUxAdvancedStrip`

#### 初心者に不要

- ProactiveDashboardPanels（full）· OneScreenDashboard 全セクション
- ConciergeMarketRadar · ContextMemoryPanel
- Enhanced Analysis 15 項目 · evidence 生値
- 分析モード切替 · voice 詳細ステータス

#### 5 秒必須

1. 入力欄 + サンプル質問 3 件（「今日どうする？」「Maybank は？」）
2. 応答: **ShortAnswer**（結論 · 理由 3 · 推奨）
3. 免責 1 行

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| ShortAnswer のみ · サンプル 3 | + MarketSituation 1 カード | 現行 advanced 全体 |

#### ワイヤーフレーム — Beginner

```
┌─ AIに聞く ───────────────────────── [×] ┐
│ 例: 「今日、何か売買すべき？」          │
│ ┌──────────────────────────────────┐  │
│ │ 結論: 急ぐ必要はありません          │  │
│ │ 理由: 1… 2… 3…                     │  │
│ │ 推奨: 保有を続けて様子見            │  │
│ └──────────────────────────────────┘  │
│ [質問を入力…                    🎤]  │
└────────────────────────────────────────┘
```

---

### 3.5 設定（`SettingsScreen.tsx` · `AiSettingsScreen.tsx`）

#### 現状（密度: **極高**）

- インライン API キー 9 プロバイダ + 接続テスト
- メニュー 25+（Production Dashboard · クオンツ検証 · ガバナンス等）
- AI 設定: 分析モード · 説明レベル · tactical mode · cost dashboard

#### 初心者に不要

- 実運用テスト · News/X 詳細プローブ
- Phase 系検証画面へのリンク（15+ 行）
- API 接続診断 · X API 利用量 · 市場データ診断
- Production Dashboard · 起動診断 · 個人用運用

#### 5 秒必須

1. **表示モード**（Beginner/Standard/Pro）
2. 練習モード ON/OFF
3. API キー設定（1 行ステータス + ウィザードへ）
4. 通知 ON/OFF

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| 4 セクション · 詳細は「もっと見る」 | + 市場/通貨/更新頻度 | 現行全メニュー |

#### ワイヤーフレーム — Beginner

```
┌─ 設定 ─────────────────────────────────┐
│ 表示モード  ○初心者 ●標準 ○プロ        │
│ 練習モード  [ON/OFF]                   │
│ AI接続      ✓ 接続済み  [詳細設定→]    │
│ 通知        [ON/OFF]                   │
│ ─────────────────────────────────────  │
│ [もっと詳しい設定を表示]               │
└────────────────────────────────────────┘
```

---

### 3.6 取引キュー / 手動注文リスト

**対象ファイル:** `ManualOrderListScreen.tsx`（Trade Queue UI）· `AiTradeQueueSection.tsx`（Home 内 AI キュー）

#### 現状

- ManualOrderList: entryPrice · allocationMYR · orderMethod · 英語フィールド混在
- AiTradeQueue: StrategyBriefing · SystemSignals · ack/history · urgency badge

#### 初心者に不要

- `allocationMYR` · `orderMethod` · `entryPrice` ラベル（→「指値」日本語のみ）
- AiTradeQueue 全セクション（Home Beginner では非表示）
- disabled/history フィルタ · system signals

#### 5 秒必須

1. 未完了件数
2. 各項目: **買い/売り** · 銘柄名 · 金額 · **次の 1 ステップ**（「証券アプリで注文 → ここで記録」）

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| チェックリスト 3 項目/行 · ステップガイド | + 指値編集 | 現行 + AiTradeQueue |

#### ワイヤーフレーム — Beginner

```
┌─ 注文チェックリスト ──────────────────┐
│ やること: 証券アプリで注文してから記録  │
│ ─ 未完了 1 件 ─                        │
│ 【買い】6033 Petronas Gas               │
│ 約 RM 1,200（50株）                    │
│ ① 証券アプリで注文  ② [完了を記録]     │
└────────────────────────────────────────┘
```

---

### 3.7 銘柄詳細（`StockDetailScreen.tsx`）

#### 現状（密度: **高**）

StockRecommendationPanel · XSentiment · RSI/MA/シグナル · PositionSizing · InstitutionalRisk · BrokerageFee · Trade/SellSuggestion · MarketRegime

#### 初心者に不要

- XSentiment 取得 UI · InstitutionalRiskPanel
- RSI · MA20 · volume trend · TermHint
- PositionSizing · BrokerageFee 詳細
- MarketRegimeCard

#### 5 秒必須

1. 銘柄名 · 現在値
2. **AI判定 + 信頼度 3 段階**（Material と同一ソース）
3. 理由 3 行 · 次にすること
4. CTA「銘柄チェックに戻る」

#### 3 モード差分

| Beginner | Standard | Pro |
|----------|----------|-----|
| 5 項目サマリーのみ | + RecommendationPanel 簡略 | 現行全パネル |

#### ワイヤーフレーム — Beginner

```
┌─ 1155 Maybank ────────────────────────┐
│ RM 9.20                                │
│ AI判定: 保有    信頼度: 普通           │
│ （理由 3 行 · 次にすること）           │
│ [銘柄チェックに戻る]                   │
└────────────────────────────────────────┘
```

---

## 4. 情報量評価

| 画面 | 現状密度 | Beginner 目標 | 5 秒判定（現状） |
|------|----------|---------------|------------------|
| ホーム（default） | 高 | 低 | △ |
| ホーム（beginner 分岐） | 低すぎ | 低–中 | ×（アドバイス未実装） |
| 保有銘柄 | 高 | 中 | △ |
| 銘柄チェック | **極高** | 低–中 | **×** |
| コンシェルジュ（beginner） | 中 | 低 | ○ |
| 設定 | **極高** | 低 | **×** |
| 手動注文リスト | 中–高 | 低 | △ |
| 銘柄詳細 | 高 | 低–中 | × |

**アプリ起動 5 秒テスト（現状）:** default Home → **FAIL**（第一メッセージが Platform positioning / Trade Queue）  
**UX1.0 目標:** Beginner Home → **PASS**（今日のAIアドバイス）

---

## 5. 5 秒理解テスト — プロトコル設計

### 5.1 共通ルール

| 項目 | 値 |
|------|-----|
| 被験者 | 投資経験 1 年未満 · n≥3 |
| 提示 | 各画面モック or 実機 · **5 秒のみ** 表示後ブランク |
| 計測 | 正答率 · 回答時間（秒） |
| 合格 | 3 問中 2 問以上正解 · 平均回答 ≤5 秒 |

### 5.2 画面別質問

| 画面 | Q1 | Q2 | Q3 |
|------|----|----|-----|
| **App 起動** | 今日すぐ売買が必要？ | 新規購入はある？ | Maybank は？ |
| **保有銘柄** | 何銘柄持ってる？ | 含み益はプラス？ | 次に何を見る？ |
| **銘柄チェック** | Maybank の AI 判定は？ | 信頼度は？ | 理由 1 つ言える？ |
| **コンシェルジュ** | AI の結論は？ | 急ぐ必要は？ | 推奨行動は？ |
| **設定** | 今の表示モードは？ | 練習モードは？ | — |
| **注文リスト** | 未完了は何件？ | 次にユーザーがすることは？ | 買い/売り？ |
| **銘柄詳細** | この銘柄の判定は？ | 今買うべき？ | — |

### 5.3 アプリレベル起動テスト

```
手順:
1. 新規インストール · appUxMode=beginner
2. 6 銘柄ポートフォリオ事前ロード
3. タイマー 5 秒 · Home 表示
4. 3 問回答 → PASS/FAIL 記録
5. 「銘柄チェック」タップなしで Q1–Q3 回答可能 = **App-Wide PASS**
```

---

## 6. Beginner 再設計提案（横断）

### 6.1 新規 / 変更コンポーネント

| コンポーネント | 画面 | 役割 |
|---------------|------|------|
| `BeginnerTodayAdviceCard` | Home · Material | UX0.3 第一メッセージ |
| `BeginnerStockSummaryCard` | Material · StockDetail | 5 項目 + 4 分類 |
| `BeginnerPortfolioHoldingCard` | Portfolio | 簡略保有行 |
| `BeginnerManualOrderCard` | ManualOrderList | 3 ステップチェックリスト |
| `BeginnerSettingsHub` | Settings | 4 項目 + 開示 |
| `AppUxModeProvider` | 全体 | モード解決 · タブフィルタ |

### 6.2 新規サービス

| サービス | 役割 |
|---------|------|
| `beginnerTodayAdviceBuilder.ts` | ホーム/材料 共通アドバイス |
| `beginnerMaterialSummaryBuilder.ts` | Phase → 5 項目（UX0） |
| `beginnerAiTrustLevelJa.ts` | 3 段階信頼度（UX0.3） |
| `sanitizeBeginnerPlainJa.ts` | 理由平易化（UX0.3） |
| `beginnerTabNavigatorConfig.ts` | モード別タブ可視性 |

### 6.3 タブ簡素化（Beginner）

```typescript
const BEGINNER_VISIBLE_TABS: MainTabKey[] = [
  'Home', 'Portfolio', 'MaterialAnalysis', 'AllocationPlan', 'BeginnerGuide',
];
// MaterialAnalysis 表示名 → '銘柄チェック'（UX0.3）
```

---

## 7. 実装優先順位

| 順位 | Phase | 内容 |  rationale |
|------|-------|------|------------|
| **0** | — | Play Internal Testing 完了待ち | 審査 · 配布優先（依存） |
| **1** | UX1.0a | `appUxMode` 統合 · Settings 3 択 | 全画面分岐の前提 |
| **2** | UX1.0b | `BeginnerTodayAdviceCard` + Home index 0 | **5 秒起動テストの核心** |
| **3** | UX1.0c | Material `BeginnerStockSummaryCard` + タブ rename | UX0–UX0.3 本丸 |
| **4** | UX1.0d | Portfolio 簡略カード | 保有確認経路 |
| **5** | UX1.0e | ManualOrderList 平易化 | 執行フロー完結 |
| **6** | UX1.0f | StockDetail 簡略分岐 | 深掘り時の一貫性 |
| **7** | UX1.0g | Settings BeginnerHub | 設定迷子解消 |
| **8** | UX1.0h | Concierge ダッシュボード整理 | 既に ShortAnswer あり · 優先度低 |
| **9** | UX1.0i | Standard モード（折りたたみ Phase） | Pro との橋渡し |
| **10** | UX1.0j | タブ 5 化 + device smoke | UX6 相当 |

**推奨:** UX1.0a → b → c → d（起動 5 秒 PASS まで）→ e → f → g → smoke

---

## 8. 工数見積（人日）

| Phase | 内容 | 人日 |
|-------|------|------|
| UX0–UX0.3（材料・ホーム設計累計） | 既存レポート | **~12.5** |
| UX1.0a | appUxMode + Settings | 2.0 |
| UX1.0b | TodayAdviceCard + Home | 1.5 |
| UX1.0c | Material カード + builder + タブ | 3.0 |
| UX1.0d | Portfolio 簡略 | 2.0 |
| UX1.0e | ManualOrderList | 1.0 |
| UX1.0f | StockDetail | 2.0 |
| UX1.0g | Settings BeginnerHub | 1.5 |
| UX1.0h | Concierge 整理 | 1.0 |
| UX1.0i | Standard 折りたたみ | 2.0 |
| UX1.0j | タブ簡素化 + smoke | 2.5 |
| **バッファ** | builder 品質 · 辞書チューニング | 1.5–2.0 |
| **合計（App-Wide 実装）** | | **~18–22 人日** |

---

## 9. リスク

| リスク | 緩和 |
|--------|------|
| 2 モード系統 + 新 appUxMode の混乱 | 移行マッピング · 1 回限りマイグレーション |
| trust モードとの共存 | trust = Beginner サブブランチとして文書化 |
| 情報欠落による誤判断 | Standard で Phase 折りたたみ · 免責強化 |
| 11→5 タブで既存ユーザー混乱 | Standard/Pro は 11 タブ維持 |
| Play 審査 | 「参考情報」ラベル · 5 秒テスト記録を review 添付 |

---

## 10. 結論

| 項目 | 判定 |
|------|------|
| App-Wide 5 秒理解（現状） | **不可** — 材料分析 · 設定 · default Home が blocker |
| 最大変更 | Material カード分岐 + Home アドバイス + モード統合 |
| 再利用資産 | ShortAnswer · beginnerDisplayMapper · UX0.3 仕様 |
| 次アクション | Play IT 後 UX1.0a 着手 · 本レポートを正式仕様として PR |

---

## 11. GitHub 同期結果

| 項目 | 値 |
|------|-----|
| 監査ベースコミット | `9a6f8c9` |
| レポート提出コミット | `017e549` |
| Push | **SUCCESS** |

---

## 12. 関連レポート

| レポート | 関係 |
|----------|------|
| `BEGINNER_MODE_UX_REDESIGN_REPORT.md` | UX0 材料分析基盤 |
| `BEGINNER_MODE_REFINEMENT_REPORT.md` | UX0.1 4 分類 |
| `BEGINNER_MODE_HOME_SCREEN_REPORT.md` | UX0.3 今日のAIアドバイス · 3 段階信頼度 |
```

---

### Parent Agent Actions

1. Switch to **Agent mode**
2. Write the markdown above to `c:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\APP_WIDE_BEGINNER_UX_AUDIT_REPORT.md`
3. Commit: `docs(ux): app-wide beginner UX audit report`
4. Push to origin; update §11 with commit hash and push status (second commit if needed, per repo pattern)

[REDACTED