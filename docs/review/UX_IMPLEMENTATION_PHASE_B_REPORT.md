# UX Implementation Phase B Report

| 項目 | 内容 |
|------|------|
| フェーズ | **Phase B — 今日のAIアドバイス · 保有「このまま持つ？」 · AI相談クイックアクション** |
| 実装コミット | `73a232e` |
| レポートコミット | `c93bcdb` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |

---

## 1. 実装内容

### 1.1 サービス / 定数

| ファイル | 役割 |
|----------|------|
| `src/services/beginner/beginnerTodayAdviceBuilder.ts` | 材料 + 保有 + strategy から今日のAIアドバイス生成 |
| `src/services/beginner/beginnerAiJudgmentJa.ts` | 4分類マッピング · 保有質問回答 · 一行要約 |
| `src/constants/beginnerAiTrustLevelJa.ts` | pct → 高い/普通/低い · 説明文 · 星数パース |
| `src/constants/beginnerConciergeQuickActionsJa.ts` | UX1.1 §6.4 クイックアクション 6 件 |
| `src/constants/beginnerTabLabelsJa.ts` | 銘柄チェック CTA 文言 |

### 1.2 コンポーネント

| コンポーネント | 役割 |
|----------------|------|
| `BeginnerTodayAdviceCard` | 今日のAIアドバイス · 日付 · 最大5行 · 新規購入なし · フッター · CTA |
| `BeginnerPortfolioHoldingCard` | このまま持つ？ · AI判定 · 信頼度3段階 · 価格/PnL · CTA |
| `BeginnerConciergeQuickActions` | 6 チップ · seed でチャット送信 |

### 1.3 画面統合

| 画面 | 変更 |
|------|------|
| `HomeScreen` | `isBeginnerMode` 時 index 0 にアドバイスカード · 保有1行サマリー · CTA 2+2 |
| `PortfolioScreen` | beginner 分岐 — `BeginnerPortfolioHoldingCard` 一覧 · 分析/露出非表示 |
| `MaterialAnalysisScreen` | beginner 時 index 0 に同一アドバイスカード |
| `AiAssistantChat` | concierge + beginner でクイックアクション · ダッシュボード非表示 |

### 1.4 テスト

| コマンド | 結果 |
|----------|------|
| `npx vitest run tests/unit/beginner*.test.ts` | **15/15 PASS** |
| `npm run typecheck` | 既存 TS エラー残存（Phase B 新規ファイル起因のエラーなし） |

---

## 2. スクリーンショット

| 項目 | 結果 |
|------|------|
| 実機 adb | デバイス `FYRWXSNNAIOR9DCM` |
| Phase B APK | **versionCode 19** · `artifacts/preview-v19-phase-b.apk`（35,917,457 bytes） |
| インストール | `adb install -r` **成功** · `versionCode=19` 確認 |

| # | ファイル | 内容 |
|---|----------|------|
| 1 | `docs/review/phase-b-screenshots/01-home-advice-card.png` | ホーム **今日のAIアドバイス** カード |
| 2 | `docs/review/phase-b-screenshots/02-portfolio-hold-card.png` | 保有 **このまま持つ？** カード |
| 3 | `docs/review/phase-b-screenshots/03-concierge-quick-actions.png` | AI相談 **クイックアクション** チップ |
| 4 | `docs/review/phase-b-screenshots/04-material-advice-card.png` | 銘柄チェック **アドバイスカード** |

キャプチャスクリプト: `scripts/capture-phase-b-screenshots.mjs`  
メタ: `docs/review/phase-b-screenshots/capture-meta.json`

---

## 3. APK確認

| 項目 | 内容 |
|------|------|
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| Gradle | **BUILD SUCCESSFUL** |
| versionCode | **19**（`app.json` · `android/app/build.gradle`） |
| APK | `artifacts/preview-v19-phase-b.apk`（gitignore 対象） |
| 実機インストール | `adb install -r` → **Success** |

---

## 4. Git

| 項目 | 値 |
|------|-----|
| 実装コミット | `73a232e` |
| レポートコミット | `c93bcdb` |
| push 先 | `origin/cursor/top3-maxdd-capital-audit` |
| push 結果 | **成功** — `dec81e2..c93bcdb` |

---

## 5. スコープ外（Phase C 以降）

- BeginnerOnboardingFlow 3 ステップ
- 銘柄チェック詳細カード（理由3行 · 気をつける点）
- scrollToSymbol 遷移 param 連携
