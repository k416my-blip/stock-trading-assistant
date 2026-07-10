# Fable App Evaluation Package

Generated: 2026-07-10T10:15+08:00  
App: **Malaysia Stock AI Concierge**  
Branch: `cursor/top3-maxdd-capital-audit`  
versionCode: **45** / package: `com.assistant.stocktrading`

本資料は外部 AI 評価ツール **Fable** 向けの現状評価パッケージです。  
良い点だけでなく、既知の課題・リスク・未完了作業を隠さず記載しています。

---

## 1. アプリ概要

| 項目 | 内容 |
|------|------|
| アプリ名 | Malaysia Stock AI Concierge |
| package | `com.assistant.stocktrading` |
| versionCode / versionName | **45** / `1.0.0` |
| 対象市場 | マレーシア株式（Bursa）を主対象とした投資支援 |
| 想定ユーザー | 初心者〜中級の個人投資家（手動で証券口座に注文する人） |
| 主な目的 | AI による買付候補・予算配分・見送り判断の**支援** |
| 売買の位置づけ | **実売買アプリではない** |
| 発注 | **自動発注機能はない** |
| 運用前提 | ユーザーが楽天証券などの証券アプリへ**手動入力**して注文する |

---

## 2. アプリの主要機能

| 機能 | 概要 |
|------|------|
| AI Concierge | 予算・数量・モードに応じた買付提案・見送り判断 |
| 予算・数量指定 | 指定額 / 数量での提案。使い切り強制なし |
| 今日のおすすめ | 優先提案一覧。候補なし時は「おすすめなし」を正常表示 |
| beginner strict | 初心者向け厳格モード。弱候補を buy にしない |
| 残現金・見送り・おすすめなし | エラーではなく正式な投資判断として表示 |
| API キー設定 | 外部データ / AI 利用のための設定 UI |
| 価格取得 | 銘柄価格の取得・表示 |
| ニュース / AI 分析 | 分析・レポート系機能（長時間試験でも hour 単位で実行） |
| Manual order flow | 手動注文入力支援フロー（証券アプリへの転記前提） |
| Paper / suggestion | 提案・シミュレーション範囲。**直接発注はしない** |
| 安全設計 | 証券会社 API への自動発注を行わない |

---

## 3. 重要な設計原則

以下は受入済みの**維持必須**原則です。

1. AI コンシェルジュを**予算消化係にしない**
2. 指定額を使い切ることを**目的関数にしない**
3. 「買わない」「見送る」「現金を残す」は**正式な投資判断**
4. 低 confidence 銘柄を buy に**昇格しない**
5. beginner strict では弱候補を buy に**しない**
6. **自動売買は禁止**
7. ユーザーが最終的に証券会社アプリで**手動確認・手動注文**する

---

## 4. これまでの PASS 済み検証

### 4.1 AI Concierge Budget / Quantity UI Final Acceptance

| 項目 | 内容 |
|------|------|
| report | `AI_CONCIERGE_BUDGET_QUANTITY_UI_FINAL_ACCEPTANCE_REPORT.md`（詳細: `AI_CONCIERGE_UI_E2E_OPTIMIZATION_FINAL_FIX_REPORT.md`） |
| 判定 | **PASS** |
| 重要結果 | 残現金許容、弱候補 buy 禁止、今日のおすすめなし、beginner strict、RM5000 表示統一（実機） |
| commit | `b437bd830c57b073bf9bc3c4a2f1cdee053d60f9` |
| 残課題 | E2E 自動化の待ち最適化（低優先）。設計原則の退行防止が継続課題 |

### 4.2 OOM 12h Stability Run

| 項目 | 内容 |
|------|------|
| report | `OOM_12H_RUN_REPORT.md` |
| 判定 | **PASS**（試行 #2） |
| 重要結果 | 12h 15m 51s 完走、OOM なし、ERR_STRING_TOO_LONG なし、DevTools 0、Metro/adb 維持、foreground WARN 35（停止条件外） |
| commit / versionCode | `b437bd8…` / **44**（実機長時間は 44） |
| 残課題 | `ensureAppForeground` 判定安定化、memory_watch session jsonl 固定 |

### 4.3 CURRENT_STATUS Live Snapshot Preservation

| 項目 | 内容 |
|------|------|
| report | `CURRENT_STATUS_LIVE_SNAPSHOT_PRESERVATION_FIX_REPORT.md` |
| 判定 | **PASS** |
| 重要結果 | `npm run status` が PASS セクションを上書きしない merge 方式 |
| テスト | `devStatus.test.ts` 6/6 PASS |
| 残課題 | Live snapshot 更新が working tree に残ることがある（運用上の注意） |

### 4.4 Release Readiness / Internal Testing Stabilization

| 項目 | 内容 |
|------|------|
| report | `RELEASE_READINESS_INTERNAL_TESTING_REPORT.md` / `INTERNAL_TESTING_CHANGELOG.md` |
| 判定 | **PASS** / Play 内部テスト **GO** |
| 重要結果 | release-critical 35/35 PASS、AAB 生成成功、changelog 整合（`700ecde`） |
| AAB commit | `4d79c8b` |
| 残課題 | typecheck 17 / npm test 6 fail（既存）、Play アップロード手動待ち |

### 4.5 AAB build success

| 項目 | 内容 |
|------|------|
| build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| 判定 | **PASS** |
| artifact | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| profile | EAS `production`（app-bundle / store） |
| 残課題 | Play Console への手動アップロード未実施 |

### 4.6 Play internal testing readiness

| 項目 | 内容 |
|------|------|
| guide | `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md` |
| Closed testing ops | `PLAY_CLOSED_TESTING_TESTER_OPERATIONS_GUIDE.md` ほか（PREPARED） |
| 判定 | **GO**（アップロード可能） / 実アップロードは**手動待ち** |
| 残課題 | Opt-in・15 人募集・14 日維持・フィードバック未完了 |

---

## 5. テスト結果

| 種別 | 結果 | 分類 |
|------|------|------|
| release-critical subset | **35/35 PASS**（devStatus 6 + conciergeBudget 14 + conciergeUiE2e 8 + oomHotfix 7） | リリースゲート内 |
| `devStatus.test.ts` | 6/6 PASS | PASS |
| AI Concierge 関連 unit / 実機 | Budget/Quantity 受入 PASS、関連 smoke PASS | PASS |
| OOM hotfix 関連 | `oomHotfix.test.ts` 7/7、12h PASS | PASS |
| 12h test | 試行 #2 完走 PASS（versionCode 44） | PASS |
| AAB build | `1545a8ba` PASS（versionCode 45） | PASS |
| `npm test`（unit 全体） | **1611 pass / 6 fail** | **既存未解決**（新規 regression ではない） |
| typecheck / lint | **17 errors** | **既存未解決** |
| AAB preflight（ローカル） | typecheck で FAIL しうる | gate 外として AAB は EAS で成功 |

失敗例（既存）: `aiAssistantChatState`, `aiConciergeConversationQuality`, `buySignalForwardReturnAnalysis`（データ欠落）, `phase12Stability`, `rakutenImport/importConfidence` など。

---

## 6. 既知の課題（隠さず記載）

1. **typecheck / lint 17 errors**（既存未解決。ローカル release preflight の阻害要因）
2. **npm test 6 fail**（既存未解決）
3. **foreground WARN 35 件**（12h。停止条件外だが改善候補）
4. **`ensureAppForeground` 判定安定化**が今後の改善候補
5. **memory_watch jsonl** は次回 run から session 固定改善予定
6. **Play Console アップロードは手動作業待ち**
7. **API キー未設定時の UX** は内部テスター確認が必要
8. **内部テスターによる実機フィードバックが未完了**
9. 投資判断アプリとしての**説明責任・免責・リスク表示の強化余地**
10. 本番公開前に**プライバシーポリシー、データセーフティ、ストア掲載情報**の確認が必要
11. working tree に release 无关の未 commit 変更が多数残る可能性（ブランチ整理課題）
12. EAS 過去失敗（未追跡モジュール、expo 解決不能、Pages UTF-8）は修正済みだが、再発防止の継続監視が必要

---

## 7. Fable に評価してほしい観点

1. アプリ全体の完成度（内部テスト直前として妥当か）
2. UI/UX の分かりやすさ
3. 初心者にとって使いやすいか
4. 投資アプリとして危険な表現がないか
5. 「おすすめなし」「見送り」「現金維持」の表現が適切か
6. 自動売買と誤解されないか
7. リスク説明が十分か
8. API キー設定の UX
9. エラー表示の分かりやすさ
10. 内部テストに出してよい完成度か
11. Play 公開前に直すべき優先順位
12. typecheck / test fail をどの程度重く見るべきか
13. 既存の設計方針（予算消化しない等）に問題がないか
14. 次に修正すべき **TOP10**

---

## 8. Fable に渡す短い評価依頼文

```
Malaysia Stock AI Concierge（com.assistant.stocktrading / versionCode 45）を、第三者目線で厳しめに評価してください。

前提:
- 実売買・自動発注はしません。証券アプリへの手動入力支援アプリです。
- AI Concierge / 12h OOM / AAB 生成 / Release Readiness は PASS 済みです。
- 既知課題: typecheck 17 errors、npm test 6 fail、Play アップロード未実施、テスターフィードバック未完了。

お願い:
- 褒めるより問題点を優先してください。
- 投資アプリとして危険な点・誤解を招く表現を指摘してください。
- 初心者ユーザーに誤解を与える点があれば指摘してください。
- 内部テストに進めるべきか判断してください（YES / NO / 条件付き）。
- 修正優先度を 高 / 中 / 低 で整理してください。
- 添付の評価パッケージと関連レポートを根拠にしてください。
```

---

## 付録: ビルド識別子

| 項目 | 値 |
|------|-----|
| EAS build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| AAB artifact URL | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| AAB success commit | `4d79c8b` |
| changelog commit | `700ecde` |
| Closed testing docs commit | `2709bda` |
