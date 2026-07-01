# MULTI_LANGUAGE_VISIBLE_JA_LEAK_HOTFIX_V32_REPORT

**日付:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** M1 Standard 画面の可視日本語リーク修正のみ · versionCode **32**

---

## 1. 不具合概要

Play Store Internal Testing **v31** 実機確認で、Settings > Language を **English** / **简体中文** に切り替えても、M1 Standard モードの以下画面に **UI クローム（ラベル・見出し・ボタン）** が日本語のまま残存。

| 画面 | 代表例（v31 残存） |
|------|-------------------|
| Portfolio | 保有銘柄一覧、株価更新、APIキー設定 |
| Alerts (`AiNotificationsScreen`) | AI通知、通知音、セクション見出し |
| AI Chat（Concierge パネル） | 本日のAIコメント、今日のAI提案、通知ダイジェスト |
| Settings | 表示モード 初心者/標準/プロ ラベル |

**スコープ外（変更なし）:** M2 · 新機能 · UI デザイン変更 · Pro/Forward Validation パネル · AI 生成本文（`titleJa` / `messageJa` 等）

---

## 2. 原因分析

| 要因 | 詳細 |
|------|------|
| **ハードコード日本語** | `PortfolioHoldingsCardsSection` 等が JSX 内に日本語リテラル |
| **`MARKET_DATA_MESSAGES`** | `PortfolioPriceSyncCard` / `PriceSyncResultPanel` が定数経由で日本語表示 |
| **`APP_UX_MODE_*_JA`** | `SettingsScreen` が表示モードラベルを JA 定数直参照 |
| **Concierge パネル** | `AiDailyCommentPanel` 等が見出しを固定日本語 |
| **Alerts 未 i18n 化** | `AiNotificationsScreen` 全体 + trigger/category ラベルマップ未整備 |

---

## 3. 修正方針

1. 新規 i18n namespace **`alerts`**（ja/en/zh-Hans）
2. **`portfolio.json`** に `holdingsList.*` / `priceSync.*` を拡張
3. **`settings.json`** に `displayMode.modes.{beginner,standard,pro}.{label,hint}`
4. **`concierge.json`** に daily comment / digest / proposal ラベル
5. 対象 8 コンポーネントを `useTranslation` 化
6. `AiDailyCommentBundle` に `portfolioScore` / `holdingCount` 追加（compact 非 ja 表示）
7. 静的リークスキャン unit test 追加

---

## 4. 修正ファイル一覧

| ファイル | 変更 |
|----------|------|
| `src/i18n/config.ts` | `alerts` namespace 追加 |
| `src/i18n/resources/index.ts` | alerts バンドル登録 |
| `src/i18n/resources/{ja,en,zh-Hans}/alerts.json` | **新規** |
| `src/i18n/resources/{ja,en,zh-Hans}/portfolio.json` | priceSync / holdingsList 拡張 |
| `src/i18n/resources/{ja,en,zh-Hans}/settings.json` | displayMode.modes.* |
| `src/i18n/resources/{ja,en,zh-Hans}/concierge.json` | dailyComment / digest / proposals |
| `src/utils/alertsI18nHelpers.ts` | trigger/category ラベルマップ **新規** |
| `src/components/portfolio/PortfolioHoldingsCardsSection.tsx` | i18n |
| `src/components/portfolio/PortfolioPriceSyncCard.tsx` | i18n（MARKET_DATA_MESSAGES 除去） |
| `src/components/PriceSyncResultPanel.tsx` | i18n |
| `src/screens/AiNotificationsScreen.tsx` | 全面 i18n |
| `src/components/concierge/AiDailyCommentPanel.tsx` | i18n + compact score line |
| `src/components/concierge/ConciergeTodayProposalsPanel.tsx` | i18n |
| `src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx` | i18n |
| `src/screens/SettingsScreen.tsx` | APP_UX_MODE_*_JA → t() |
| `src/services/aiDailyCommentBuilder.ts` | portfolioScore / holdingCount |
| `tests/unit/i18n/m1VisibleJaLeakScan.test.ts` | **新規** |
| `app.json` | versionCode **32** |

---

## 5. i18n キー追加サマリー

| Namespace | 主要キー |
|-----------|----------|
| `alerts` | title, loading, sections.*, triggers.*, categories.* |
| `portfolio` | holdingsList.*, priceSync.*（60+ keys） |
| `settings` | displayMode.modes.{beginner,standard,pro}.{label,hint} |
| `concierge` | dailyCommentTitle, notificationDigestTitle, dailyComment.portfolioScoreLine, proposalLabels.* |

---

## 6. unit test 結果

```text
npx vitest run tests/unit/i18n
```

| 結果 | 詳細 |
|------|------|
| **PASS** | **18/18** |

新規 `m1VisibleJaLeakScan.test.ts`:

- en/zh-Hans 必須キー存在確認
- 英語 runtime 解決（`portfolio:priceSync.priceUpdateTitle` 等）
- M1 対象 8 コンポーネントの JSX 日本語リークスキャン

---

## 7. typecheck 結果

```text
npm run typecheck
```

| 結果 | 詳細 |
|------|------|
| **既存エラーのみ** | 新規 i18n 由来エラー **なし** |

---

## 8. versionCode 32 確認

| 項目 | 値 |
|------|-----|
| `app.json` | **32** |
| EAS `appBuildVersion` | **32** |
| EAS `gitCommitHash`（アップロード時） | `a514479` |

---

## 9. EAS build ID

`dc5ec625-a408-465e-9ac7-95d1b9a14227`

---

## 10. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/dc5ec625-a408-465e-9ac7-95d1b9a14227

---

## 11. AAB ファイル名

`malaysia-stock-ai-concierge-v32-production.aab`

---

## 12. AAB 保存場所

```
docs/review/play-it-aab-m1-ja-leak-v32/malaysia-stock-ai-concierge-v32-production.aab
```

**Artifact URL:** https://expo.dev/artifacts/eas/IPq790ILtb1p0XJpcT5cfzIdFCBcIKy0CAQMhrI2Qls.aab

**サイズ:** 54,622,047 bytes · git 未コミット（大容量バイナリ）

Manifest: `docs/review/play-it-aab-m1-ja-leak-v32/manifest.json`

---

## 13. Play Console で次にやること（Owner）

1. Internal testing → **Create new release**
2. v32 AAB をアップロード（Release name: `1.0.0 (32)`）
3. Release notes 例:

```
M1 hotfix: Portfolio, Alerts, AI Chat panels, and Settings UX mode labels now follow app language (ja/en/zh-Hans).
```

4. Rollout 後、Settings > Language → **English** / **简体中文**
5. Standard モードで確認:
   - Portfolio: Holdings / Price update / API key settings
   - Alerts: AI alerts / section headers
   - AI Chat: Today's AI comment title, proposals, notification digest
   - Settings: Display mode Beginner / Standard / Pro labels

---

## 14. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Hotfix commit** | `d6e762a` — Fix visible Japanese leaks on M1 Standard screens (v32). |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

**注:** EAS build `dc5ec625-…` はコミット前のローカル変更をアップロード（EAS メタ `gitCommitHash`: `a514479`）。ソース内容は `d6e762a` と同一。

---

## 15. push 結果

| 項目 | 値 |
|------|-----|
| **Push** | **success** — `a514479..af7f85c` → `origin/cursor/top3-maxdd-capital-audit` |
| **Hotfix commit** | `d6e762a` |
| **Report commit** | `af7f85c` |

---

## 16. 制約遵守・残存リスク

**制約遵守:** M2 禁止 · 新機能なし · UI デザイン変更なし · Pro/Forward Validation 未変更

**意図的に残す日本語（M1 out-of-scope）:**

- AI/Bursa 生成コンテンツ（`todayActionJa`, `titleJa`, `messageJa`, proposal `summaryJa` 等）
- `HoldingCard` 等 Portfolio 内の個別銘柄カード詳細（今回スコープ外）
- `QuoteSymbolDebugPanel` / provider デバッグ行

**残存リスク:** 非 ja ロケールでも AI 通知本文は日本語のまま（コンテンツ層 — M2 で多言語生成が必要）

---
