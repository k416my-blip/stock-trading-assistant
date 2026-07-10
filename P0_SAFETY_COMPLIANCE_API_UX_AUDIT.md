# P0 Safety / Compliance / API UX Audit

Generated: 2026-07-10T11:40+08:00  
Phase: **P0 Safety / Compliance / API UX Audit**  
Stance: Fable 外部評価を正とする。大規模コード修正なし（監査 + 文書のみ）。

| 項目 | 値 |
|------|-----|
| app | Malaysia Stock AI Concierge |
| package | `com.assistant.stocktrading` |
| AAB versionCode | **45** |
| Concierge / 12h 受入 versionCode | **44** |
| branch | `cursor/top3-maxdd-capital-audit` |
| working tree（本監査時） | **約 576 件** |

---

## 1. 監査対象ファイル（主なもの）

| 領域 | ファイル |
|------|----------|
| 免責定数 | `src/constants/disclaimers.ts`, `platformClarification.ts`, `investmentDisplay.ts`, `allocation.ts`, `aiStrategyBriefing.ts`, `aiConciergeLayout.ts` |
| i18n | `src/i18n/resources/ja/settings.json`, `ja/home.json` |
| UI | `RiskWarningScreen.tsx`, `RiskNoticeOrangeBox.tsx`, `PersonalUseBanner.tsx`, `PlatformClarificationCard.tsx`, `SettingsAdvancedDisclosureSection.tsx`, `AllocationPlanScreen.tsx`, `ManualOrderFlowScreen.tsx`, `HomeScreen.tsx`, `ApiKeySettingsScreen.tsx`, `AiAssistantChat.tsx` |
| 型 / Concierge | `src/types/index.ts` (`AllocationPlanInput`), `allocationPlan.ts`, `manualOrderFlow.ts`, `conciergeBudgetOptimization.ts` |
| テスト | `tests/unit/conciergeBudgetOptimization.test.ts`, `conciergeUiE2eOptimizationSmoke.test.ts`, `oomHotfix.test.ts`, `devStatus.test.ts` |
| gate | `package.json` (`lint` / `typecheck` / `test:unit`) |
| 証跡 | `FABLE_EXTERNAL_REVIEW_RESPONSE.md`, `WORKING_TREE_AUDIT_AFTER_FABLE.md` |

---

## 2. 免責・リスク表示の現状

### あるもの（実装済み文言）

| 文言 / 画面 | 内容の要点 |
|-------------|------------|
| `RISK_WARNING_BODY` / RiskWarning 画面 | 注文送信しない、元本割れ、参考値である旨 |
| `riskNotice`（settings i18n）+ `RiskNoticeOrangeBox` | 保証しない・手動実行・元本割れ・自己責任 |
| `PersonalUseBanner` / `platformClarification` | 注文送信しない、自動売買非対応、証券アプリで手動 |
| `ALLOCATION_PLAN_DISCLAIMER` | 参考プラン・保証しない・Rakuten で自分確認 |
| `MANUAL_ORDER_WARNING` | 本アプリは注文を送信しない |
| `INVESTMENT_*_DISCLAIMER_JA` | 最終購入は証券会社アプリ |
| `AI_PERSONAL_SAFETY_FOOTER` | 個人利用の分析補助・最終判断はユーザー |
| `NOT_FINANCIAL_ADVICE` | 投資助言ではない |

### ギャップ（Fable 指摘と整合）

| ギャップ | 深刻度 |
|----------|--------|
| 詳細な免責・リスク告知の主配置が **設定 → 詳細設定** 寄り。ホーム常時表示ではない | **高**（初心者が見ない） |
| Concierge チャット主画面のフッタは短い（`AI_PERSONAL_SAFETY_FOOTER`）。元本割れ・非助言の常時併記が弱い | **高** |
| 「今日のおすすめ」パネル自体に免責行が見当たらない | **高** |
| 「買い推奨」等の強いラベル（`AI_SAFE_ACTION_LABEL.suggested_buy`）が残る | **中〜高** |
| Play / SC Malaysia 等の規制準拠チェックはアプリ内・docs に未整備 | **高（公開ブロッカー）** |
| ストア掲載文・初回オンボーディングでの免責確認フローは本監査範囲外・未確認 | **高** |

**判定（免責）:** 文言資産は存在するが、**主要導線での露出不足**。内部テスト前に「どこで必ず見えるか」の最低条件定義が必要。Play 公開には不足。

---

## 3. 自動売買ではない明示の現状

### あるもの

- `NOT_SUPPORTED_CAPABILITIES_JA`: 直接注文執行・ブローカー API 自動売買・ライブ自動取引を明示
- `MANUAL_ORDER_METHOD` =「Rakuten Tradeで手動入力」
- Manual order / Allocation 画面に「注文を送信しません」系
- Settings の PlatformClarification（対応 / 非対応）

### ギャップ

| ギャップ | 深刻度 |
|----------|--------|
| Concierge / 今日のおすすめの**第一画面**に「自動売買ではない」が常時ない | **高** |
| 「AI Concierge」「おすすめ」「買い推奨」が自動化・確定推奨に読める | **高** |
| ホームは trust disclaimer 中心で、非自動売買の列挙は設定寄り | **中** |

**判定:** 設計意図は正しいが、**誤解防止の露出が設定・一部フローに偏る**。Internal は条件付き、Play は NO。

---

## 4. APIキー未設定UXの現状

### あるもの

| 項目 | 内容 |
|------|------|
| `ApiKeySettingsScreen` | OpenAI / Twelve / News / Reddit / Finnhub / X の状態「未設定」、保存・接続テスト |
| `API_KEY_SETTINGS` | 必須/任意の説明、未設定でも任意はフォールバックありと明記 |
| データ層 | Twelve/News 未設定時の notes（Yahoo 等フォールバック） |
| クラッシュ | コード上は未設定をエラー文字列・スキップで扱う設計（本監査は静的確認。実機未再実行） |

### ギャップ

| ギャップ | 深刻度 |
|----------|--------|
| 「必須未設定だと主要機能が動作しません」とあり、テスターが何を見られるか画面ごとに不明確 | **高** |
| Concierge 起動時の「キーなしでもここまで見られる」ガイドが弱い | **高** |
| プロバイダごとの未設定メッセージ統一は部分的 | **中** |
| **社内実機でのキーなし確認が未完了**（Fable: テスター前にやるべき） | **高** |

**判定:** 設定画面の土台はある。**キーなしでの Concierge / ホーム到達の実機確認が Internal 条件。**

---

## 5. strictCharterOnly / 型整合の現状

### 事実

| 項目 | 結果 |
|------|------|
| `AllocationPlanInput`（`src/types/index.ts`） | **`strictCharterOnly` プロパティなし** |
| `buildAllocationPlan` | 入力の `strictCharterOnly` を**参照しない** |
| `manualOrderFlow.defaultPlanInput` | `strictCharterOnly = true` を渡し `buildAllocationPlan` に渡す → **実行時は余剰プロパティ（無視）** |
| テスト | `strictCharterOnly: true` を `buildAllocationPlan({...})` に渡す箇所あり |
| typecheck | `TS2353: 'strictCharterOnly' does not exist on type 'AllocationPlanInput'`（Concierge 関連テスト 4 箇所） |
| vitest（focused） | **35/35 PASS**（型を実行時チェックしない） |

### 解釈

- **実行時クラッシュの直接原因にはなりにくい**（余分なオブジェクトプロパティは JS では無視）
- ただしテスト名が「strictCharterOnly で見送り」を主張しても、**プランナー側にそのスイッチが無い**ため、**意図した制御が効いていない可能性**がある
- 「35/35 PASS」と typecheck エラーの食い違いは **Fable 指摘どおり妥当**
- テスト 3 ファイルは **git 未追跡**（`devStatus` のみ tracked）— 再現性リスク

### 最小修正案（次フェーズ・本フェーズでは未実装）

1. `AllocationPlanInput` に `strictCharterOnly?: boolean` を追加し、`buildAllocationPlan` で実際に分岐する **または**
2. テストと `manualOrderFlow` から死んだプロパティを削除し、別の既存フラグ（recommendationMeta / beginner）で断言する  
→ どちらも **投資ロジック変更になりうる**ため、次フェーズで設計選択が必要。

---

## 6. lint / typecheck gate の実態

| スクリプト | 実体 |
|------------|------|
| `npm run typecheck` | `tsc --noEmit -p tsconfig.typecheck.json` |
| `npm run lint` | **同一コマンド**（ESLint ではない） |

本監査実行結果:

- typecheck / lint: **exit 2**、エラー **約 17〜22 行**（src + tests。`strictCharterOnly` 含む）
- ESLint プロセス: `npm run status` 上 **no**
- 「lint PASS」と呼ぶべきではない。正しくは **「tsc typecheck（lint スクリプトはエイリアス）」**

release gate 表現の推奨:

- `typecheck` = TypeScript 静的検査
- `lint` = 現状は typecheck の別名（将来 ESLint を分離するまで「lint」単独 PASS を宣言しない）

---

## 7. versionCode 44 → 45 差分

| 項目 | 44（例: `b437bd8` Concierge/12h） | 45（`4d79c8b` AAB） |
|------|----------------------------------|---------------------|
| versionCode | 44 | 45 |
| `src/` 差分 | — | **`conciergeBudgetOptimization.ts` 追加（+215）** が主 |
| その他 | — | app.json / build.gradle、EAS/metro/package、`.easignore` 等の **ビルドインフラ** |

**注意:** 45 は「番号だけ」ではない。**予算最適化モジュールの git 追加**が AAB 成功の前提。  
ロジック自体は 44 実機受入時にローカルで動いていた可能性が高いが、**git 上は 44→45 で当該ファイルが正式追加**されている。  
Internal 前: 45 AAB での **スモーク（起動・Concierge・キーなし）** を推奨。全面再 12h は必須ではないが、差分認識は必須。

---

## 8. working tree 上の注意点

| 項目 | 内容 |
|------|------|
| 規模 | 約 **576** 件（`git add -A` **禁止**） |
| P0 関連 | 未追跡の Concierge/OOM テスト、免責 docs、本監査レポート |
| commit すべき（本フェーズ） | 本レポート + 最小修正計画のみ |
| commit しない | logcat、AAB、scripts 大量、`android/app/build.gradle`、src 大規模修正 |
| 危険 | release-critical テスト未追跡のまま「PASS」を根拠にする状態 |

---

## 9. テスト実行記録（本監査）

| コマンド | 結果 | 分類 |
|----------|------|------|
| `npm run status` | 実行済（Cursor 高メモリ、Metro/adb 停止） | 情報 |
| `npm run typecheck` | FAIL（既存型エラー、`strictCharterOnly` 含む） | **既存** |
| `npm run lint` | FAIL（typecheck と同一） | **既存** |
| `npx vitest run` 4 ファイル | **35/35 PASS** | ローカル PASS（3 ファイル未追跡） |
| `npm test -- <file>` | `test:unit` が **全 unit** を走らせパス引数が効かない | 既存スクリプト仕様。**1611 pass / 6 fail**（既存） |

6 fail は本フェーズで修正せず記録のみ（既存・UTF-8 破損疑いの importConfidence 等）。

---

## 10. Internal testing に進むための最低条件

1. テスター向けに **「自動発注なし・証券アプリで手動・投資は自己責任・元本割れ」** を招待文で必ず周知（既存 `TESTER_INVITATION_MESSAGE_JA.md` を強化可）
2. **API キーなし**で起動・ホーム・Concierge 空状態・設定画面まで社内確認
3. versionCode **45** AAB で上記スモーク
4. 設定内の RiskWarning / PlatformClarification の場所をテスター手順に記載
5. Opt-in 後も「おすすめ＝確定買い」と読まないよう注意書き

未達のまま広く配るのは **条件付き YES を満たさない**。

---

## 11. Play 公開前の必須条件

1. 主要画面（ホーム / Concierge / おすすめ）での免責・非自動売買の常時または初回必須表示
2. 強い「買い推奨」表現の見直し
3. Google Play 金融サービスポリシー + 関連法域の確認記録
4. typecheck と release-critical の整合（`strictCharterOnly` 含む）
5. プライバシーポリシー / データセーフティ / ストア文言
6. 内部テストフィードバック反映
7. working tree / 未追跡テストの整理

→ **現状 Play 公開: NO**（維持）

---

## 12. 修正優先順位

### P0

- 主要導線の免責・誤解防止・非自動売買明示（実装は次フェーズ）
- API キー未設定の社内実機確認 + UX ギャップ解消
- typecheck/lint 実態のゲート表現修正（文書化済み）
- working tree / 未追跡 release-critical テストの扱い決定

### P1

- `strictCharterOnly` 型整合（定義追加か削除か）
- release-critical ↔ typecheck ズレ解消
- Play 提出前の表示・免責文確認

### P2

- foreground WARN、memory_watch、Pages/docs 整理

---

## 13. 最終判定

| 項目 | 判定 |
|------|------|
| 本フェーズ（監査） | **PASS**（証跡完了） |
| 製品の Internal 準備 | **PARTIAL / 条件付き YES** |
| Play 公開 | **NO** |
| 総合（P0 安全性） | **PARTIAL** — 文言資産はあるが露出・型整合・キーなし確認・規制が未達 |

**AAB があることだけでは GO にしない。** Fable 指摘どおり、投資アプリとしての安全性確認が Internal の条件。
