# Stock Trading Assistant — 第三者レビュー用 実装状況レポート

**調査日:** 2026-06-09  
**調査対象:** ローカルワークスペース（未コミット差分を含む）  
**制約:** 秘密情報（APIキー値・`.env`）は含まない。推測で「完成」とは書かない。

---

## 1. アプリ概要

### 目的

個人向け **投資分析・意思決定支援** アプリ。Rakuten Trade Malaysia 等の証券会社アプリで **手動注文** する前提で、ポートフォリオ追跡・AI分析・Bursa Malaysia 向け四季報型分析・材料分析を提供する。

README および `src/constants/platformClarification.ts` より:

> 分析・戦略提案・ポートフォリオ追跡 · 意思決定支援（証券会社での注文は別途）

### 現在できること

| 領域 | 内容 |
|------|------|
| 保有銘柄管理 | 手動追加・編集・削除、含み損益、株価同期（Yahoo/Twelve Data） |
| 練習モード | 仮想資金でのシミュレーション取引 |
| 実運用分析モード | 証券会社で約定した取引の **記録**（注文送信はしない） |
| AIコンシェルジュ | OpenAI API + エビデンス束 + 15項目拡張分析ブロック |
| Bursa 四季報型分析 | KLSE Screener HTML パース、Phase3–6 分析、銘柄発掘 |
| 材料分析 Phase11 | Bursa開示 / News API / RSS / X / Reddit RSS の5ソース統合 |
| 今日の売買・資産運用・市場監視・AI通知 | Bursa Phase8–10 連携タブ |
| ポートフォリオ提案 | 配分プラン、Trust/Beginner 表示モード |
| 設定・診断 | APIキー設定、接続診断、セキュリティ設定 |

### まだできないこと

| 項目 | 状態 |
|------|------|
| **実注文・ブローカー連携** | **未実装（意図的に禁止）** `REAL_TRADING_ENABLED = false` |
| Rakuten Trade 等への直接発注 | 非対応 |
| ライブ自動売買 | 非対応 |
| Reddit OAuth 公式API | ユーザー環境で登録ブロック時あり → **RSS 代替のみ** |
| bursamalaysia.com 公式API直 fetch | Cloudflare によりモバイル直 fetch 不可 → **KLSE Screener ミラー使用** |
| Expo Go でのプッシュ通知 | **意図的に無効**（dev build のみ） |
| 全銘柄の完全な四季報データ | 取得失敗時は「データ未取得」表示 |
| 米国・香港の Bursa 同等深度分析 | Bursa 専用 Phase が中心。US/HK は株価・基本分析は可能だが四季報型は薄い |

### 実注文機能の有無

**なし。**

- コンパイル時ロック: `src/constants/runtimeKernel.ts` 等で `REAL_TRADING_ENABLED = false`
- 手動注文リスト（`ManualOrderListScreen`）は **チェックリスト・記録用**
- 練習モードは `paperBroker` シミュレーション

### 使用市場

| 市場 | 対応 | 備考 |
|------|------|------|
| **Bursa Malaysia** | **主戦場** | Phase1–11、四季報、材料分析、今日の売買等 |
| **米国 (us)** | 部分対応 | 株価（Yahoo/Twelve Data）、AIコンシェルジュ、配分プラン |
| **香港 (hk)** | 部分対応 | 同上。Bursa 専用機能は対象外 |

型定義: `type Market = 'bursa' | 'us' | 'hk'`（`src/types/index.ts`）

---

## 2. 技術構成

### フレームワーク

| 項目 | バージョン |
|------|-----------|
| Expo | **54.0.21** |
| React Native | **0.81.5** |
| React | **19.1.0** |
| TypeScript | ~5.9.2 |
| エントリ | `expo/AppEntry.js` → `App.tsx` |

### 主要ライブラリ

| パッケージ | 用途 |
|-----------|------|
| `@react-navigation/*` v7 | タブ + スタックナビ |
| `@react-native-async-storage/async-storage` | アプリ状態・キャッシュ永続化 |
| `expo-secure-store` | APIキー等シークレット |
| `expo-notifications` | ローカル通知（dev build のみ実行） |
| `expo-speech` / `expo-haptics` | 音声読み上げ・触覚 |
| `react-native-chart-kit` / `react-native-svg` | チャート |
| `vitest` + 大量 `verify:*` スクリプト | テスト・検証 |
| `sta-native-runtime` (local module) | Android ネイティブ計測 |

### データ保存方式

| 種別 | 保存先 | 例 |
|------|--------|-----|
| ポートフォリオ・設定・キャッシュ | **AsyncStorage** | `@sta/app_state`, `@sta/portfolio_*`, `@sta/quote_cache_v1` |
| APIキー | **Expo SecureStore**（抽象層 `secretStorage.ts`） | `sta.secret.ai_api_key` 等 |
| レガシー平文キー | 移行後削除予定 | `@sta/twelve_data_api_key` 等 |

### APIキー保存方式

- UI: `ApiKeySettingsScreen` / `ApiSetupWizardScreen`
- 読み書き: `src/services/secretStorage.ts`（SecureStore 優先、破損時は purge + メモリ fallback）
- マスク表示: `src/utils/secretMask.ts`
- **`.env` はアプリ実行時には使わず**、主に SecureStore + 設定画面

### 使用している外部API / データソース一覧

| ID | 名称 | キー要否 | 用途 |
|----|------|---------|------|
| openai | OpenAI API | 要 | AIコンシェルジュ、四季報コメント生成 |
| twelve_data | Twelve Data | 要（任意） | 株価フォールバック |
| — | **Yahoo Finance** | **不要** | 株価・ファンダメンタル **最優先** |
| newsapi | NewsAPI | 要（任意） | ニュース材料 |
| x | X (Twitter) API | 要（任意） | SNS材料・センチメント |
| reddit | Reddit OAuth | 任意 | 未設定時は **Reddit RSS** |
| alpha_vantage / finnhub / polygon / fmp | 各種 | 要（任意） | 予備・診断 |
| — | **KLSE Screener HTML** | 不要 | Bursa 開示・財務（非公式ミラー） |
| — | Yahoo/Google/Bursa **RSS** | 不要 | 無料ニュース fallback |
| stooq | Stooq | 不要 | 株価プロバイダ候補（設定上存在） |

設定定義: `src/config/apiProviders.ts`  
株価優先順: Yahoo → Twelve Data → Alpha Vantage（`src/constants/quoteProviders.ts`）

---

## 3. 実装済み機能一覧

| 機能 | 完成度 | データ種別 | 使用API | 画面名 | 主要ファイル |
|------|--------|-----------|---------|--------|-------------|
| **保有銘柄管理** | **完成** | 実データ（ユーザー入力）+ 実株価 | Yahoo / Twelve Data | ポートフォリオ（タブ `Portfolio`） | `PortfolioScreen.tsx`, `portfolio*.ts`, `useAppPortfolioActions.ts` |
| **AIコンシェルジュ** | **部分完成** | 実データ + OpenAI生成。API未設定/mockOnly時は**モック** | OpenAI, エビデンス各種 | FABオーバーレイ `AiAssistantChat` | `AiAssistantChat.tsx`, `aiStrategyService.ts`, `conciergeEvidenceBuilder.ts`, `buildConciergeEnhancedAnalysis.ts` |
| **AI四季報** | **部分完成** | 実データ優先。失敗時「データ未取得」。銘柄マスタは `sampleStocks` 参照 | Yahoo, Twelve Data, News API, KLSE(Bursa) | スタック `StockReport`（AI四季報） | `StockReportScreen.tsx`, `aiStockReportDataFetcher.ts`, `aiStockReportService.ts` |
| **Bursa 本物四季報（Phase6）** | **部分完成** | **実HTMLパース**（KLSE Screener）。欠損は「データ未取得」 | KLSE Screener HTML, 内部 Phase3–5 | スタック `BursaDiscovery` / スクリーナーから遷移 | `BursaDiscoveryScreen.tsx`, `bursaPhase6Analysis.ts`, `bursaKlseHtmlClient.ts` |
| **材料分析 Phase11** | **部分完成** | **実fetch**。センチメントは**キーワード推定**（MLではない） | Bursa(KLSE), News API, RSS, X, Reddit RSS | タブ `MaterialAnalysis` | `MaterialAnalysisScreen.tsx`, `bursaMaterialSources.ts`, `bursaMaterialSentiment.ts`, `redditRssQuality.ts` |
| **Reddit RSS** | **部分完成** | 実RSS。フィルタ後件数は**少ない**（1155例: 155→3件） | `reddit.com/search.rss` | 材料分析画面内 | `redditRssQuality.ts`, `bursaMaterialSources.ts` |
| **X API** | **部分完成** | キー設定時のみ実fetch。未設定は `skipped` | X API v2 | 材料分析 / コンシェルジュ / `XApiUsage` | `xApiService.ts`, `SettingsScreen` テストボタン |
| **News API** | **部分完成** | キー設定時のみ。未設定は RSS fallback | NewsAPI everything | 材料分析 / 設定テスト | `bursaMaterialSources.ts`, `newsApiEverythingTest.ts` |
| **Twelve Data** | **部分完成** | キー設定時。Yahoo 失敗時フォールバック | Twelve Data quote | 全画面の株価 | `marketDataService.ts`, `quoteProviders/*` |
| **Yahoo Finance** | **完成（株価）** | **実データ**（キー不要） | Yahoo quote/chart/RSS | ポートフォリオ・四季報・材料RSS | `yahooFinanceQuote.ts`, `freeNewsFallback.ts` |
| **今日の売買 Phase8** | **部分完成** | Bursa分析 + 材料スコア連動。データ欠損時固定文言 | 上記統合 | タブ `TodayTrading` | `TodayTradingScreen.tsx`, `bursaTodayTradingService.ts`, `bursaPhase8Analysis.ts` |
| **AI通知 Phase10** | **部分完成** | ルールベース通知生成。Expo Go では通知配信不可 | 内部 + 材料/判定 | タブ `AiNotifications` | `AiNotificationsScreen.tsx`, `bursaConciergeNotificationBuilder.ts` |
| **AI資産運用 Phase7** | **部分完成** | 保有銘柄 × Bursaスコア統合 | Phase6/7 + 材料 | タブ `AssetManagement` | `AssetManagementScreen.tsx`, `bursaAssetManagementService.ts` |
| **市場監視 Phase9** | **部分完成** | ウォッチリスト + 判定。AsyncStorage | Phase9 + 材料 | タブ `MarketMonitoring` | `MarketMonitoringScreen.tsx`, `bursaMarketMonitoringService.ts` |
| **ポートフォリオ提案** | **部分完成** | 配分アルゴ + Trust表示。株価は実データ、手数料は**概算** | Yahoo/Twelve + 内部 | タブ `AllocationPlan` | `AllocationPlanScreen.tsx`, `alertEngine.ts`, `trustRecommendationSummary.ts` |

---

## 4. データ品質

### 実データで取得できている項目（API/キー正常時）

- 株価・日中変動・出来高（Yahoo / Twelve Data）
- Bursa 開示・財務・配当履歴（KLSE Screener HTML パース）
- News API ヘッドライン（キー設定時）
- Yahoo/Google/Bursa RSS ヘッドライン（キー不要）
- Reddit RSS 投稿タイトル（フィルタ後）
- X 投稿トレンドワード・センチメント集計（キー設定時）
- ユーザーの保有株数・平均取得単価（ローカル保存）

### 取得できていない / 不安定な項目

- bursamalaysia.com 公式サイト直 fetch（Cloudflare）
- Reddit OAuth（環境により未設定）
- 全銘柄・全四半期の完全財務（HTML パース失敗時）
- Expo Go での push 通知
- 米国・香港の Bursa 同等の開示深度

### 推定値を使っている箇所

| 箇所 | 内容 |
|------|------|
| 材料センチメント | **英日キーワード正規表現**で好材料/悪材料/中立（`bursaMaterialSentiment.ts`） |
| 材料スコア | `baseScore × SOURCE_WEIGHT × keywordStrength`（推定スコア） |
| 理論株価・割安率 | PER 法等ルールベース（`bursaOverallJudgment.ts`） |
| 為替・手数料 | 固定概算（`rakutenTrade.ts` の `FX_TO_MYR`, `estimateBrokerageFee`） |
| AI四季報コメント | OpenAI 生成（事実 + 推論の混合。リスク制御プロンプトあり） |

### モックデータが残っている箇所

| ファイル/機能 | 用途 |
|-------------|------|
| `src/data/sampleStocks.ts` | 銘柄検索カタログ、通貨/market 解決、**価格履歴 fallback**（コメント: "replace with live API later"） |
| `src/data/mockAiChat.ts` | AIオフ / `mockOnly` モードの初期メッセージ・即答 |
| `AiSettingsScreen` の `mockOnly` トグル | 外部 API 不使用の明示モード |
| 練習モード (`paperBroker`) | 仮想約定 |

### データ未取得時の表示仕様

- 共通文言: **`データ未取得`**（`SHIKIHO_MISSING_JA`, `MATERIAL_MISSING_JA`, `MATERIAL_ANALYSIS_MISSING_JA` 等）
- 材料分析: ソース別ステータス（`ok` / `partial` / `skipped` / `unavailable` / `failed`）
- 確信度不足: **`分析不能`** または判断材料不足のみ（`CONFIDENCE_GATE_MIN_PCT = 45` 未満）

### API未設定時の表示仕様

- News API / X / Reddit OAuth: ステータス **`skipped`** → RSS 等 fallback または「未接続」
- OpenAI 未設定: モック応答バナー「AI機能オフ — モック応答のみ」
- 全体: `MaterialAnalysisScreen` の API接続一覧で「未接続」表示

---

## 5. AI分析ロジック

### AI判断に使っている材料

1. **エビデンス束** (`conciergeEvidenceBuilder.ts`): 株価・出来高・ニュース・Xセンチメント・保有状況
2. **材料分析行** (`MaterialStockRow`): Bursa/News/RSS/X/Reddit のスコア付き材料
3. **Bursa Phase 判定**: 割安率・配当・5年トレンド・ROE・バフェットスコア
4. **OpenAI** (`aiStrategyService.ts`): 上記を `evidenceData` としてプロンプト注入
5. **リスク制御** (`conciergeRiskControlBuilder.ts`, `aiRiskControl.ts`)

### スコア計算式（主要2系統）

**A. 材料スコア（Phase11）**

```
itemScore = baseScore(±12) × SOURCE_WEIGHT × keywordStrength
SOURCE_WEIGHT: bursa_announcement=1.5, news_api=1.2, rss=1.0, x=0.85, reddit=0.75
total = clamp(-100..100, sum of non-neutral items)
overallScore(0-100) = clamp(50 + materialScore/2)
```

（`bursaMaterialSentiment.ts`, `buildConciergeEnhancedAnalysis.ts`）

**B. Bursa 総合投資判定**

```
PER割安/割高 ±25/±12, 配当 ±15/−18, 5年トレンド ±8/−10, ROE ±12, バフェット ±10, 業界順位 +8
→ score 閾値で判定
```

（`bursaOverallJudgment.ts`）

**C. コンシェルジュ確信度**

```
available evidence scores (priceAction, volume, news, xSentiment, volatility) の加重平均
− dataGaps × 8 − quoteStale × 12
→ clamp 0–100
```

（`conciergeActionGuideBuilder.ts` `computeConfidence`）

### 判定条件

**Bursa 四季報型（強気買い / 買い / 保有 / 注意 / 見送り）**

| スコア | 判定 |
|--------|------|
| ≥ 40 | 強気買い |
| ≥ 15 | 買い |
| ≥ −10 | 保有 |
| ≥ −30 | 注意 |
| < −30 | 見送り |

**AIコンシェルジュ拡張分析（強い買い / 買い / 中立 / 売り / 強い売り）**

| materialScore | 判定 |
|---------------|------|
| ≥ 40 | 強い買い |
| ≥ 15 | 買い |
| −15〜14 | 中立 |
| ≤ −15 | 売り |
| ≤ −40 | 強い売り |

（材料スコア null 時は `marketStance` で ±20 代替）

### 確信度の算出

- 銘柄別: `guide.confidencePct`（エビデンススコア平均 − 欠損ペナルティ）
- 全体: `riskControl.overallConfidencePct`
- **45% 未満**: 推測回答・行動提案禁止（`CONFIDENCE_GATE_MIN_PCT`）
- 拡張分析の総合スコア: `materialScoreToOverallScore` + `(confidencePct - 50) × 0.15` 調整

### ソース別スコア（材料分析 UI）

`MaterialStockRow.sourceScoreBreakdown` — ソースラベル別の合計スコア（Bursa Announcement / News API / RSS / X / Reddit RSS）

### Reddit / News / X / Bursa / Twelve Data の反映

| ソース | 反映方法 |
|--------|---------|
| **Bursa** | KLSE HTML 開示 → 材料 headline → 重み1.5 → 四季報 Phase 判定 |
| **News API** | everything 検索 → 材料 + コンシェルジュ news スコア |
| **RSS** | Yahoo/Google/Bursa RSS → 材料（キー不要 fallback） |
| **X** | トレンドワード headline + `xSentiment` スコア（bearish/panic/hype） |
| **Reddit** | RSS 品質フィルタ（Stage1+2）→ 投資関連のみ → 重み0.75 |
| **Twelve Data** | 株価フォールバックのみ（材料スコアには直接入らない） |

### 投資助言と誤認されないための注意表示

- `NOT_FINANCIAL_ADVICE`: 「投資助言ではありません」
- `ANALYSIS_SUPPORT_DISCLAIMER_JA`: Rakuten Trade で手動注文
- `RiskWarningScreen`, `BeginnerWarningBanner`
- AIプロンプト: 未確認情報に `[RUMOR]`、hallucination 禁止（`AI_RISK_CONTROL_PROMPT_JA`）
- 配分プラン: `ALLOCATION_PLAN_DISCLAIMER`, Trust/Beginner 免責

---

## 6. 実機検証結果（Android）

### 確認済み（report.json あり）

| 検証 | 結果 | 日時 | 内容 |
|------|------|------|------|
| AI拡張分析 15項目 | **PASS** | 2026-06-09 | 1155 Maybank 質問、15/15 ラベル、クラッシュなし |
| Reddit RSS Stage2 | **取得成功** | 2026-06-09 | 1155: fetched 155 → valid 3、投資材料信頼度「高」 |

詳細: 同フォルダ `evidence/*.json` 参照。

### PASS したテスト（記録あり）

- `evidence/ai-enhanced-analysis-device-verify.json` → `overall: "PASS"`
- `tests/unit/buildConciergeEnhancedAnalysis.test.ts`（ユニット）
- `tests/unit/redditRssQuality.test.ts`（ユニット）

### FAIL / 未完了（記録あり）

| 項目 | 状態 |
|------|------|
| AI拡張分析 初回実行 | **FAIL**（Metro 未接続・UI タップ座標誤り）→ 修正後 PASS |
| `npm run typecheck` | **FAIL**（2026-06-09。多数 TS エラー、主に分析用 unit test） |
| `npm test` / 一部 verify | **FAIL**（2026-05-23 記録: RN import 問題で ~48 suite load 失敗、3 assertion 失敗） |
| News API / X API device verify | スクリプト存在、**report.json なし**（未確認） |
| Bursa Phase1 device verify | スクリプト存在、**report.json なし** |

### スクリーンショット保存先

| パス | 内容 |
|------|------|
| `scripts/ai-enhanced-analysis-device-verify/` | UI XML ダンプ。report 参照: `04-ai-analysis-result.png`, `05-missing-data-no-crash.png` |
| `agent-tools/` | デバイススクショコピー（`.gitignore` 対象） |

### 検証コマンド

```bash
node scripts/verify-ai-enhanced-analysis-device.mjs
npm run verify:bursa-device
npm run verify:news-api-test-device
npm run verify:x-api-test-device
npm run verify:quick
npm run test:unit
```

### 現在残っている不具合（確認済み）

1. **typecheck 失敗** — 未コミットの分析テスト群に TS エラー多数
2. **Vitest + React Native** — Node 上で ~48 suite が import 失敗（インフラ問題）
3. **AI拡張分析** — 15項目表示に **スクロール必須**（FAB 内）
4. **Reddit RSS** — 除外率 ~98%（設計上。有効件数が少ない）
5. **Expo Go** — 通知無効
6. **未コミット差分が大きい** — 最新機能が GitHub HEAD に未反映

---

## 7. GitHub状況

| 項目 | 値 |
|------|-----|
| リポジトリ URL | https://github.com/k416my-blip/stock-trading-assistant.git |
| 現在のブランチ | `cursor/top3-maxdd-capital-audit` |
| 最新コミット | `a3a430adddeb0f914e5ba6f0a32737973cdc17cb` |
| 未コミット差分 | **あり（約 1,277 エントリ）** |
| `.env` / APIキー | **Git 未追跡**（`.gitignore` で除外確認済み） |
| pre-commit | **あり** — `core.hooksPath = .githooks`。`.env` ブロック + `sk-` 等パターン検出 |
| CI | `.github/workflows/ci.yml` — main/master push/PR で typecheck + unit + verify:quick |

詳細: [GIT_SNAPSHOT.md](./GIT_SNAPSHOT.md)

---

## 8. セキュリティ

| 項目 | 状態 |
|------|------|
| APIキー保存 | **Expo SecureStore**（`secretStorage.ts`） |
| SecureStore 使用 | **使用中**（iOS/Android）。Web/不可時はメモリ + レガシー移行 |
| `.env` | `.gitignore` 対象。**リポジトリに含まれない** |
| GitHub 秘密情報 | 追跡ファイルに `.env` なし。APIキー関連は抽象化コードのみ |
| 静的検証 | `npm run verify:security` — 2026-05-23 記録では **PASS** |
| 今後危険な箇所 | ① 未コミット差分に秘密混入リスク ② KLSE 非公式スクレイピングの ToS/可用性 ③ 分析スクリプト JSON に個人データ混入の可能性 ④ レガシー AsyncStorage 平文キー残存（移行中） |

---

## 9. 現在の課題（重大度別）

### Critical

1. **実注文機能は意図的に無い** — 商用「自動売買」不可（設計通りだが期待値管理必須）
2. **未コミット差分 1,000+ 件** — レビュー・再現・CI が HEAD と乖離
3. **typecheck 失敗** — CI merge ブロッカーになりうる

### High

1. Bursa データ源が **KLSE Screener 非公式ミラー** — 障害・ToS リスク
2. Reddit OAuth 未使用時は RSS のみ — 材料カバレッジ限定的
3. Vitest/RN import 問題 — テスト信頼性低下
4. Expo Go 通知無効 — Phase10 AI通知の実機検証は dev build 必須
5. 材料センチメントが **キーワード推定** — 誤判定リスク

### Medium

1. `sampleStocks.ts` 依存 — 未登録銘柄・価格履歴 fallback
2. AI拡張分析 UI がスクロール必須 — UX
3. 米国・香港分析深度が Bursa より浅い
4. 手数料・為替が固定概算
5. 一部 unit test assertion 失敗（paper broker 等、2026-05 記録）

### Low

1. 大量 `verify:runtime-*` スクリプト — 商用必須か不明
2. 57 画面 + 420 services — 保守コスト
3. ドキュメント（`docs/review/`）が HEAD より古い部分あり

---

## 10. 次にやるべき優先順位（商用化・実運用・安定性）

| 順位 | 項目 | 理由 |
|------|------|------|
| **1** | 未コミット差分の整理・コミット・CI 通過 | 再現性・レビュー可能性 |
| **2** | `typecheck` / `verify:quick` 修正 | merge ブロッカー解消 |
| **3** | Phase11 + AI拡張分析の E2E 再検証（dev build） | コア価値の実機保証 |
| **4** | APIキー・秘密情報の pre-commit 実運用確認 | 漏洩防止 |
| **5** | Bursa データ源の可用性監視（KLSE 障害検知） | 実運用安定性 |
| **6** | 材料センチメント精度改善 or 不確実性表示強化 | 誤判断リスク低減 |
| **7** | `sampleStocks` 依存の縮小（live search のみ） | データ品質 |
| **8** | EAS development build + 通知検証 | Phase10 完成度 |
| **9** | US/HK 分析深度の明示的スコープ決定 | 期待値管理 |
| **10** | 投資助言規制・免責の法務レビュー | 商用化前提 |

---

## 11. ChatGPT評価用まとめ

### 【現在の完成度】

**UI：** 6/10 — タブ・画面は豊富。Bursa 向け UI は実装済み。AI 15項目は FAB 内スクロール必須。57 画面は過剰設計感あり。

**データ取得：** 5/10 — Yahoo/KLSE/Bursa RSS は実データ。News/X/Reddit はキー・フィルタ依存。非公式ミラー・高除外率 Reddit。未取得時表示は誠実。

**AI分析：** 6/10 — OpenAI + エビデンス + リスク制御あり。材料スコアはキーワード推定。確信度ゲート（45%）あり。mockOnly フォールバック明示。

**投資判断補助：** 5/10 — Bursa ルール判定 + コンシェルジュ提案は動作。実注文なし。手数料・為替概算。助言ではない免責あり。

**安全性：** 7/10 — SecureStore、REAL_TRADING ロック、pre-commit フック、verify:security PASS（記録）。未コミット大量差分がリスク。

**商用化可能性：** 3/10 — 個人分析ツールとしては有望。ブローカー連携・規制・CI 安定・データ源 ToS・テスト信頼性が商用障壁。

**総合評価：** **5/10（個人利用 PoC〜β）** — Bursa Malaysia 特化の分析 OS として実装深度は高いが、データ品質のばらつき・未コミット差分・CI 失敗・非公式データ源により、第三者商用評価では「研究開発段階」。

### 【第三者レビューで特に見てほしい点】

- **実注文が永久に無い設計**（`REAL_TRADING_ENABLED = false`）が意図通りか、UX 上誤解されないか
- **KLSE Screener 非公式 HTML パース**の合法性・可用性・障害時フォールバック
- **材料センチメントのキーワード推定**が投資判断に使うには十分か、不確実性表示は十分か
- **AI 15項目拡張分析**の判定（materialScore 閾値）と OpenAI 生成文の整合性・hallucination 耐性
- **確信度 45% ゲート**の妥当性（過剰ブロック vs 過剰提案）
- **Reddit RSS 98% 除外** — 品質 vs カバレッジのトレードオフ
- **未コミット 1,277 件** — 何が本番相当か、HEAD とのギャップ
- **typecheck / test 失敗** — 本番バグ vs テストインフラ問題の切り分け
- **Bursa 中心・US/HK 薄い** スコープがプロダクトとして妥当か
- **Expo Go 制限**（通知なし）下での Phase10 価値
- **SecureStore + pre-commit** — 秘密管理は商用最低ラインを満たすか
- **投資助言規制** — 免責文だけで足りるか（マレーシア/日本）
- **sampleStocks モックカタログ** が live データと混在するリスク
- **57 画面 / 420 services / 100+ verify スクリプト** — 保守可能なアーキテクチャか、削減すべきか

---

*End of report. Evidence: `./evidence/`. Git snapshot: `./GIT_SNAPSHOT.md`.*
