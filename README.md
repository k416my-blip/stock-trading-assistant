# Stock Trading Assistant — 評価提出用 README

**文書種別:** ChatGPT / 第三者レビュー向け  
**更新日:** 2026-06-09  
**対象:** ローカルワークスペース（未コミット差分を含む）  
**制約:** APIキー値は記載しない。推定・モックは実データと混同しない。

---

## 1. 現在のアプリ目的

**投資分析・提案専用**の React Native + Expo (TypeScript) モバイルアプリです。

| 項目 | 内容 |
|------|------|
| 目的 | Bursa Malaysia 中心のポートフォリオ追跡・四季報型分析・材料分析・AIコンシェルジュによる意思決定支援 |
| 売買実行 | **しない** — `REAL_TRADING_ENABLED = false`（コンパイル時ロック） |
| 自動発注 | **しない** — ブローカーAPI連携なし |
| 実運用 | 証券会社（Rakuten Trade Malaysia 等）で手動注文し、本アプリでは約定 **記録** のみ |
| 主な機能域 | **本物四季報（KLSE）** · **AI資産運用** · **今日の売買** · **市場監視** · **リアルタイム材料分析** · **AI通知** · **AIコンシェルジュ（15項目分析）** |

対応市場: `bursa`（主）/ `us` / `hk`（株価・基本分析は可能、Bursa 専用 Phase は薄い）

---

## 2. 実装済み機能一覧（Phase別）

| Phase | 名称 | 完成度 | 主要画面 / 入口 | 主要ファイル |
|-------|------|--------|-----------------|-------------|
| **1** | Bursa Malaysia 実データ取得基盤 | 部分完成 | 銘柄詳細・四季報 | `bursaDisclosureService.ts`, `bursaKlseHtmlClient.ts` |
| **2** | 5年推移・AI評価 | 部分完成 | AI四季報 `StockReport` | `bursaTrendAnalysis.ts`, `bursaAiAnalysis.ts` |
| **3** | 同業比較・業界ランキング・競争優位・バフェットスコア | 部分完成 | AI四季報 / 銘柄発掘 | `bursaPhase3Analysis.ts` |
| **4** | 大株主・事業別売上・地域別売上・四季報コメント・予想 | 部分完成 | AI四季報 | `bursaPhase4Analysis.ts`, `bursaShikihoComments.ts` |
| **5** | フェアバリュー・配当判断・業績トレンド・総合投資判断 | 部分完成 | AI四季報 | `bursaPhase5Analysis.ts`, `bursaOverallJudgment.ts` |
| **6** | Bursa全体ランキング・ポートフォリオ提案 | 部分完成 | `BursaDiscovery`, タブ `AllocationPlan` | `bursaPhase6Analysis.ts`, `AllocationPlanScreen.tsx` |
| **7** | AI資産運用タブ | 部分完成 | タブ `AssetManagement` | `bursaPhase7Analysis.ts`, `AssetManagementScreen.tsx` |
| **8** | 今日の売買タブ | 部分完成 | タブ `TodayTrading` | `bursaPhase8Analysis.ts`, `TodayTradingScreen.tsx` |
| **9** | 市場監視タブ | 部分完成 | タブ `MarketMonitoring` | `bursaPhase9Analysis.ts`, `MarketMonitoringScreen.tsx` |
| **10** | AI通知 | 部分完成 | タブ `AiNotifications` | `bursaPhase10Analysis.ts`, `AiNotificationsScreen.tsx` |
| **11** | リアルタイム材料分析 | 部分完成 | タブ `MaterialAnalysis` | `bursaPhase11Analysis.ts`, `bursaMaterialSources.ts` |
| **11.5** | API統合監査 | 部分完成 | 材料分析内監査行 / CLI | `bursaMaterialApiAudit.ts`, `scripts/bursa-phase11.5-api-audit.ts` |
| **11.6** | UI未達修正（データ品質・ソース別スコア表示） | 部分完成 | 材料分析 | `bursaMaterialDataQuality.ts`, `MaterialAnalysisScreen.tsx` |
| **AI分析強化** | コンシェルジュ15項目ブロック | 部分完成 | FAB `AiAssistantChat` | `buildConciergeEnhancedAnalysis.ts`, `ConciergeEnhancedAnalysisBlock.tsx` |

**注記:** Phase 1 は **bursamalaysia.com 公式APIではなく KLSE Screener HTML パース**（非公式ミラー）。失敗時は「データ未取得」。

---

## 3. データソース一覧

| データソース | 用途 | 接続状態 | 実データか | APIキー必要か | 取得できる項目 | 取得できない項目 | 注意点 |
|-------------|------|----------|-----------|--------------|---------------|-----------------|--------|
| **Bursa / KLSE Screener** | 開示・財務・配当・四季報基盤 | キー不要・HTML取得 | **実データ**（パース成功時） | 不要 | 会社概要、四半期、配当、開示タイトル、一部株主 | 営業利益（常に未取得表示）、Annual Report PDF 全文、公式Bursa直API | Cloudflare により公式サイト直 fetch 不可。非公式ミラー依存 |
| **Yahoo Finance** | 株価・チャート・RSS | 通常接続可 | **実データ** | 不要 | 現在値、日中変動、OHLCV、RSS見出し | 全銘柄・全履歴の完全性 | Bursa は `XXXX.KL` 形式 |
| **Twelve Data** | 株価フォールバック | キー設定時 | **実データ**（成功時） | 任意 | quote | Yahoo 失敗時のみ補助 | 最優先は Yahoo |
| **News API** | 材料・ニュース | キー設定時のみ | **実データ**（成功時） | **要** | everything ヘッドライン | キー未設定時は skipped | 未設定時は RSS fallback |
| **X API** | SNS材料・センチメント | キー設定時のみ | **実データ**（成功時） | **要**（Bearer） | search/recent 投稿要約 | キー未設定時は skipped | 節約モード：質問時のみ・15分キャッシュ |
| **Reddit RSS** | 投資関連投稿 | OAuth なしで利用可 | **実データ**（RSS） | 不要 | フィルタ後タイトル | 大半は品質フィルタで除外 | 1155例: 155件→3件有効 |
| **Reddit OAuth API** | 公式 Reddit API | **未使用** | — | 要（未登録） | — | OAuth 全般 | reCAPTCHA 等で登録ブロックの報告あり |
| **RSS fallback** | 無料ニュース | キー不要 | **実データ**（RSS） | 不要 | Yahoo/Google/Bursa RSS 見出し | 本文・センチメント精度 | News API 未設定時の代替 |

---

## 4. 実データ・推定・モック・未取得・API未接続の区別

| 分類 | 該当する主な項目 |
|------|-----------------|
| **実データ** | Yahoo/Twelve 株価、KLSE HTML からの財務・配当・開示、News/X/Reddit（キー・fetch 成功時）、ユーザー入力の保有株、Reddit RSS（フィルタ後） |
| **ルール計算** | Bursa 総合投資判断スコア、PER フェアバリュー、配当判定、バフェットスコア、業界ランキング、材料スコア集計 |
| **推定** | 材料センチメント（英日キーワード正規表現）、為替 `FX_TO_MYR`、手数料 `estimateBrokerageFee`、推奨エンジンの `analyzeSnsSync` |
| **モック** | `sampleStocks.ts`（銘柄カタログ・価格履歴 fallback）、`mockAiChat.ts`（AIオフ/mockOnly）、`getMockAiTradeQueue()`（緊急キュー）、練習モード `paperBroker` |
| **未取得** | 営業利益（`financials.operatingProfit` — KLSE パース未対応）、Annual Report PDF 株主名簿、HTML パース失敗フィールド → UI 表示 **`データ未取得`** |
| **API未接続** | News/X/Reddit OAuth キー未設定時 → ステータス `skipped` または「未接続」。OpenAI 未設定時 → モック応答バナー |

---

## 5. AI分析ロジック

### AIコンシェルジュ回答生成フロー

```
ユーザー質問
  → 銘柄抽出・意図分類
  → conciergeEvidenceBuilder（株価・ニュース・X・保有）
  → conciergeActionGuideBuilder（ルールベース行動案・確信度）
  → conciergeRiskControlBuilder（45%ゲート・推測禁止）
  → OpenAI API（evidenceData 注入）※ mockOnly/キー無し時は mockAiChat
  → buildConciergeEnhancedAnalysis（15項目ブロック）
  → ConciergeEnhancedAnalysisBlock 表示
```

### AI分析強化ブロック（15項目）

1. 銘柄名 2. 現在株価 3. 保有株数 4. 評価額 5. 含み損益  
6. 総合判定 7. 確信度 8. 判断理由 9. ポジティブ材料 10. ネガティブ材料  
11. リスク 12. 次に確認すべきポイント 13. AI推奨アクション 14. ソース別スコア 15. 総合スコア

### 材料スコア計算

```
itemScore = baseScore(±12) × SOURCE_WEIGHT × keywordStrength
SOURCE_WEIGHT: Bursa=1.5, News=1.2, RSS=1.0, X=0.85, Reddit=0.75
materialScore = clamp(-100..100, Σ non-neutral items)
overallScore(0-100) = clamp(50 + materialScore/2)
```

（`bursaMaterialSentiment.ts` — **キーワード推定、MLではない**）

### ソース別スコア（材料分析 UI）

`MaterialStockRow.sourceScoreBreakdown` — Bursa Announcement / News API / RSS / X / Reddit RSS 別合計

### 総合判定の分類

**Bursa 四季報型（Phase 5）:** 強気買い / 買い / 保有 / 注意 / 見送り

| スコア | 判定 |
|--------|------|
| ≥ 40 | 強気買い |
| ≥ 15 | 買い |
| ≥ −10 | 保有 |
| ≥ −30 | 注意 |
| < −30 | 見送り |

**AIコンシェルジュ拡張分析:** 強い買い / 買い / 中立 / 売り / 強い売り（materialScore 閾値 ±15 / ±40）

### 確信度の算出

```
evidenceScores (priceAction, volume, news, xSentiment, volatility) の加重平均
− dataGaps × 8 − quoteStale × 12 → clamp 0–100
45% 未満: 推測回答・行動提案禁止（CONFIDENCE_GATE_MIN_PCT）
```

### 買い / 保有 / 売り / 注意 / 見送り の判定条件

- **Bursa Phase 5:** PER割安率、配当判定、5年トレンド（売上・利益・EPS）、ROE同業差、バフェットスコア、業界順位を加点減点（`bursaOverallJudgment.ts`）
- **コンシェルジュ:** 上記材料スコア + `marketStance`（bullish/neutral/bearish）+ カテゴリ（panic, opportunity 等）
- **注意 / 見送り:** Bursa スコア −30 未満 → 見送り、−10〜−30 → 注意。確信度不足時は「分析不能」

投資助言ではない旨: `NOT_FINANCIAL_ADVICE`, `RiskWarningScreen`, AI プロンプトの `[RUMOR]` 付与義務

---

## 6. 実機検証結果（Android）

| 検証対象 | 検証端末 | 検証日 | 検証コマンド | 結果 | スクリーンショット / 証跡 | 失敗後の修正 |
|---------|---------|--------|-------------|------|-------------------------|-------------|
| **AI分析強化 15項目** | Android（`com.assistant.stocktrading`, 1220×2712） | 2026-06-09 | `node scripts/verify-ai-enhanced-analysis-device.mjs` | **PASS**（15/15ラベル、クラッシュなし） | `scripts/ai-enhanced-analysis-device-verify/report.json` | Metro 未接続・FAB/入力タップ座標修正、`adb reverse tcp:8081` |
| **データ欠損時クラッシュなし** | 同上 | 2026-06-09 | 同上（質問: `hello`） | **PASS** | 同上 `missingDataTest.pass: true` | — |
| **表示崩れ** | 同上 | 2026-06-09 | 同上 | **ラベル検出OK**（スクロール必須。レイアウト自動検証なし） | `04-ai-analysis-result.png`（report 参照） | — |
| **Reddit RSS（OAuthなし）** | 同上 | 2026-06-09 | 材料分析経由 | **取得成功**（1155: 155→3件） | `scripts/reddit-rss-verify/report.json` | Stage1+2 品質フィルタ実装 |
| **News API 接続** | Android | 手動セッション | 設定 →「News API テスト」/ `npm run verify:news-api-test-device` | **実装済み・自動 report 未保存** | `scripts/api-key-device-verify/manual-newsapi.xml`（当時「接続状態: 未テスト」） | 設定画面テストボタン実装済み。HTTP 200 の確定レポートは要再実行 |
| **X API search/recent** | Android | 手動セッション | 設定 →「X API テスト」/ `npm run verify:x-api-test-device` | **実装済み・自動 report 未保存** | `scripts/api-key-device-verify/x-ui-*.xml` | Bearer 正規化・節約モード実装済み。HTTP 200 の確定レポートは要再実行 |

**正直な注記:** AI分析・Reddit のみ `report.json` で PASS を確認。X / News の HTTP 200 は本 README 更新時点で **自動 report.json が存在しない**。ユニットテスト（モック fetch）では News/X テストロジックは PASS。

---

## 7. 現在の制約・未解決課題

- **Reddit OAuth API** — 未登録または未使用。RSS のみ運用
- **Reddit RSS** — 利用可だが品質フィルタ必須（除外率が高い）
- **Bursa 公式 API** — 未使用（KLSE Screener ミラー）
- **Annual Report PDF 解析** — 未実装。大株主は開示変更 HTML で代替、PDF 未取得時は明示
- **営業利益** — KLSE パース未対応 → 常に **データ未取得** 表示
- **Expo Go** — ローカル通知・プッシュは意図的に無効（dev build のみ）
- **実注文 API** — なし（設計上禁止）
- **証券会社連携** — なし。手動注文リストはチェックリスト用途
- **typecheck 失敗** — 分析用 unit test の型エラー多数（CI ブロッカー）
- **未コミット差分 ~1,277 件** — GitHub HEAD より進捗が先行

---

## 8. セキュリティ状況

| 項目 | 状態 |
|------|------|
| APIキー in README | **記載しない**（本書も同様） |
| 保存場所 | **Expo SecureStore**（`secretStorage.ts`）。レガシー AsyncStorage キーは移行中 |
| `.env` | `.gitignore` 対象。**リポジトリ未追跡** |
| `.cursorignore` | `.env` / ログ / `agent-tools/` 等を除外 |
| GitHub 秘密情報 | 追跡ファイルに `.env` なし。抽象化コードのみ |
| pre-commit | `core.hooksPath = .githooks` — `.env` ブロック + `sk-` 等パターン検出 |
| push 済みブランチ | `cursor/top3-maxdd-capital-audit` |
| 最新コミット | `a3a430adddeb0f914e5ba6f0a32737973cdc17cb`（2026-06-09） |
| 本 README 更新の push | **未実施**（ユーザー依頼なし） |

---

## 9. 品質チェック実行結果（2026-06-09）

| コマンド | 結果 | 概要 |
|---------|------|------|
| `npm run dev:check` | **FAIL** (exit 2) | `tsc --noEmit` で `tests/unit/` 配下に型エラー多数 |
| `npm run test:unit` | **FAIL** (exit 1) | **504** files passed / **9** failed — **1691** tests passed / **10** failed（約 432s） |
| `npm run verify:quick` | **FAIL** (exit 2) | 先頭の typecheck で停止（verify 本体未到達） |

### 失敗詳細と修正方針

**1. `npm run dev:check` / `verify:quick`（typecheck）**

- **エラー例:** `forwardValidation*.test.ts` の型不一致、`openAi*.test.ts` の `OhlcvBar` 未定義、`trustMonthlyPerformanceReport.test.ts` の Market 型、`userAnalysisSymbols.test.ts` の PortfolioPosition 不足
- **原因:** バックテスト・分析用テストが本体型定義の変更に追従していない。アプリ本体 `src/` 単体の致命エラーとは限らない
- **修正方針:** ① 分析テストを `tsconfig` から分離、または ② 型を本体に合わせて修正、③ CI はコアテストのみに限定

**2. `npm run test:unit`（10件失敗）**

- **例:** `openAiBuyVolLowAtrGridAnalysis` — `Yahoo 7103.HK HTTP 404`（ライブ Yahoo 依存）
- **例:** `openAiBuyVsProxyFinalBuy` — `symbols.find(...)!` が undefined
- **原因:** 一部テストが外部 API・未登録銘柄・古い fixture に依存
- **修正方針:** ライブ fetch テストをモック化、fixture 更新、または `vitest` exclude に分析監査テストを分離

**コア機能ユニット（参考・同日実行）:**  
`buildConciergeEnhancedAnalysis`, `redditRssQuality`, `newsApiEverythingTest`, `xApiSearchRecentTest` → **22/22 PASS**

---

## 10. 起動手順（開発者向け）

```bash
npm install
npx expo start          # または npm run start:clear
```

| 機能 | Expo Go |
|------|---------|
| ホーム / 保有 / 株価 | 可 |
| AIコンシェルジュ | 可 |
| ローカル通知 | **無効**（意図的） |
| APIキー（SecureStore） | 可 |

通知を使う場合: EAS development build + `npx expo start --dev-client`

```bash
# 品質チェック（評価用）
npm run dev:check
npm run test:unit
npm run verify:quick

# 実機検証（Android + adb）
node scripts/verify-ai-enhanced-analysis-device.mjs
npm run verify:news-api-test-device
npm run verify:x-api-test-device
```

**技術スタック:** Expo 54.0.21 · React Native 0.81.5 · React 19.1.0 · TypeScript ~5.9.2

---

## 11. ChatGPT評価用まとめ

### 現在完成していること

- Bursa 向け Phase 1–11 の **コード実装**（KLSE 実データパース、材料5ソース、各タブ UI）
- AIコンシェルジュ + **15項目拡張分析**（Android 実機 PASS: 15/15）
- Reddit RSS 品質フィルタ（実 fetch・投資材料抽出）
- ポートフォリオ手動管理・Yahoo 株価・SecureStore APIキー・投資助言でない免責 UI
- 練習モード（paper broker）と実運用分析モードの二系統

### まだ弱いこと

- typecheck / 一部 unit test 失敗（分析・バックテスト系）
- 材料センチメントはキーワード推定（精度限界）
- Reddit 除外率高、News/X はキー依存
- 営業利益・PDF 等の四季報完全性
- Expo Go 通知不可、X/News の自動実機 report 未整備

### 実運用に近い部分

- ユーザー保有 + Yahoo 実株価 + KLSE 開示パース + 手動証券会社注文前提の記録フロー
- AIコンシェルジュ（OpenAI + エビデンス + 45% 確信度ゲート）
- Bursa タブ群（今日の売買・資産運用・市場監視・材料分析）

### まだ検証が必要な部分

- X API / News API の **自動** 実機 report（HTTP 200 の再現記録）
- Phase 10 通知（development build）
- US/HK の Bursa 同等深度
- 長時間 soak・商用 CI 安定化

### 次の優先順位 TOP10

1. 未コミット差分の整理・コミット
2. typecheck 修正（または分析テストの tsconfig 分離）
3. コア unit test のみ CI 通過
4. X/News 実機 verify の `report.json` 化
5. Phase11 + AI15項目の dev build E2E
6. KLSE 障害監視・フォールバック
7. 材料センチメントの不確実性表示強化
8. `sampleStocks` モック依存の縮小
9. EAS dev build で通知検証
10. 投資助言規制・法務レビュー

### 評価してほしい観点

- KLSE 非公式ミラーの可用性・ToS・障害時 UX
- キーワード材料スコアを投資判断に使う妥当性
- AI 15項目と OpenAI 生成文の整合性・hallucination 耐性
- 確信度 45% ゲートの妥当性
- 実注文なし設計の UX 上の明確さ
- モック（緊急キュー・sampleStocks）と実データの混在リスク
- 57 画面 / 420 services の保守可能性
- 商用化に必要な最小スコープの切り出し

---

## 12. 関連ドキュメント

| パス | 内容 |
|------|------|
| [docs/review/third-party-review-2026-06-09/](docs/review/third-party-review-2026-06-09/) | 第三者レビュー用パッケージ（詳細レポート + evidence JSON） |
| [docs/AI_CONCIERGE_ARCHITECTURE.md](docs/AI_CONCIERGE_ARCHITECTURE.md) | コンシェルジュ設計 |
| [docs/GIT_COMMIT_PREP.md](docs/GIT_COMMIT_PREP.md) | コミット準備 |

**リポジトリ:** https://github.com/k416my-blip/stock-trading-assistant.git

---

*本 README は評価提出用です。APIキー・秘密情報は含みません。*
