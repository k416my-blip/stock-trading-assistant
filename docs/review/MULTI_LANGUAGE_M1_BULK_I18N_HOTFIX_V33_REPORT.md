# MULTI_LANGUAGE_M1_BULK_I18N_HOTFIX_V33_REPORT

**日付:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** M1 A/B/C 一括 i18n Hotfix · versionCode **33** · M2/新機能/UI変更なし

---

## 1. エグゼクティブサマリー

v32 最終監査（`MULTI_LANGUAGE_M1_FINAL_AUDIT_REPORT.md`）で検出された **M1 可視日本語リーク（A/B/C）** を一括修正。Portfolio / Home / Stock Check 見出し / AI Chat UI chrome / Settings M1 範囲 / Rakuten Import / glossary（TermHint）を `useTranslation` + JSON 化。Standard モードで Pro/FV ダッシュボードを非表示化。

| 指標 | v32 監査前 | v33 Hotfix 後（静的再監査） |
|------|-----------|---------------------------|
| 静的 TSX 検出 | **311** | **147**（−53%） |
| en i18n リーク | — | **4**（Rakuten Trade 固有名詞のみ） |
| zh-Hans i18n リーク | **37** | **48**（漢字共通語の誤検出含む） |
| unit test `tests/unit/i18n` | 18/18 | **20/20** |

---

## 2. 不具合概要

English / 简体中文 表示時に M1 画面へ日本語 UI ラベル・Alert・glossary 説明・定数経由メッセージが残存。実機で Portfolio「今持っている株」、Stock Check 見出し、AI Chat Pro パネル、Settings API キー行等が確認されていた。

**スコープ外（変更なし）:** M2（AI/Bursa 生成 `titleJa`/`messageJa`/材料スコア文）· 新機能 · UI デザイン変更 · Pro 監査セクション本文（Standard で非表示化のみ）

---

## 3. 原因分析

| 要因 | 詳細 |
|------|------|
| **GLOSSARY 直参照** | `TermHint` / `LabeledValue` が `glossary.ts` 日本語固定 |
| **Portfolio 未 i18n** | `HoldingCard` / `PortfolioScreen` sell-all Alert・ボタン |
| **Home 残存** | trust Alert・pro ボタン・onboarding |
| **Stock Check 見出し** | `MaterialAnalysisScreen` セクションタイトル固定 |
| **Concierge Pro パネル** | Standard でも `conciergeUxDashboardBlock` 可視 |
| **Settings 深部** | API キー管理ブロック・リセット確認の一部ハードコード |
| **定数経由** | `marketData.ts` / `sellAllHoldings.ts` メッセージ |

---

## 4. 修正方針

1. 新規 namespace **`glossary`**（58 用語 + `explainTitle`）
2. **`portfolio.json`** に `holding.*` / `sell.*` 拡張
3. **`home.json`** trust / proButtons / onboarding / proactive
4. **`stockCheck.json`** 見出し・接続状態・フッター（生成スコア行は M2）
5. **`concierge.json`** `alerts.*` + failure kind ラベル
6. **`settings.json`** `common` / `nav` / `apiKeys` / `reset` / `priceRefresh` / `rakutenRow`
7. **`rakutenImport.json`** `alerts.*`
8. **`marketDataI18n.ts`** — price refresh / failure status ヘルパ
9. Standard モード: `AiAssistantChat` Pro ダッシュボード非表示（`isProMode` ゲート）
10. `m1VisibleJaLeakScan.test.ts` — M1_SCREENS 全ファイル + en/zh かなスキャン

---

## 5. 修正ファイル一覧

| カテゴリ | ファイル |
|----------|----------|
| **i18n 基盤** | `src/i18n/config.ts`, `resources/index.ts`, `{ja,en,zh-Hans}/glossary.json`（新規）, 各 namespace JSON 拡張 |
| **Portfolio** | `PortfolioScreen.tsx`, `HoldingCard.tsx`, `TermHint.tsx` |
| **Home** | `HomeScreen.tsx`, `BeginnerOnboardingModal.tsx`, `ProactiveSuggestionsHomeCard.tsx` |
| **Stock Check** | `MaterialAnalysisScreen.tsx`（見出し + Phase11.5 は Pro のみ） |
| **AI Chat** | `AiAssistantChat.tsx`（alerts i18n + Pro パネル非表示） |
| **Settings** | `SettingsScreen.tsx`（M1: API/reset/display/Rakuten/price refresh） |
| **Rakuten** | `RakutenImportManualEntryScreen.tsx`, `RakutenImportConfirmScreen.tsx` |
| **Utils** | `src/utils/marketDataI18n.ts`（新規） |
| **Scripts** | `scripts/generate-glossary-i18n.mjs`, `scripts/audit-m1-i18n-final.mjs` |
| **Tests** | `tests/unit/i18n/m1VisibleJaLeakScan.test.ts` |
| **Version** | `app.json` versionCode **33** |

---

## 6. i18n キー追加サマリー

| Namespace | 主要追加 |
|-----------|----------|
| `glossary` | 58 用語 `label`/`description` + `explainTitle` |
| `portfolio` | `holding.*`, `sell.*`, priceSync 拡張 |
| `home` | `trust.*`, `proButtons.*`, `onboarding.*`, `proactive.*` |
| `stockCheck` | `sections.*`, `connected`, `scoreBreakdown`, `footerNote` |
| `concierge` | `alerts.*`（API key / OCR / failure kinds） |
| `settings` | `common.*`, `nav.*`, `apiKeys.*`, `reset.*`, `priceRefresh.options.*`, `rakutenRow.*` |
| `rakutenImport` | `alerts.*` |

---

## 7. unit test 結果

```text
npx vitest run tests/unit/i18n
```

| 結果 | 詳細 |
|------|------|
| **PASS** | **20/20**（4 files） |

`m1VisibleJaLeakScan.test.ts` 拡張内容:

- M1_SCREENS 全 25 コンポーネントパスを JSX かなスキャン
- en/zh-Hans 全 namespace のひらがな/カタカナ検出（Rakuten Trade 等 allowlist）
- D/E/F allowlist コメント付き（`*Ja` フィールド、Phase/Debug、銘柄名）

---

## 8. typecheck 結果

```text
npm run typecheck
```

| 結果 | 詳細 |
|------|------|
| **既存エラーのみ** | 新規 i18n 由来エラー **なし** |

---

## 9. 監査スクリプト再実行

```text
node scripts/audit-m1-i18n-final.mjs
```

| 項目 | v32 監査 | v33 再監査 |
|------|---------|-----------|
| 静的 findings | 311 | **147** |
| en i18n leaks | — | 4（固有名詞 false positive） |
| zh i18n leaks | 37 | 48（漢字共通語 false positive） |

証跡: `docs/review/m1-final-audit/audit-static.json`, `audit-full.json`

---

## 10. versionCode 33 確認

| 項目 | 値 |
|------|-----|
| `app.json` | **33** |
| EAS `appBuildVersion` | **33** |

---

## 11. EAS build ID

`e7280400-8949-4bf7-b710-c0f7ced47212`

---

## 12. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/e7280400-8949-4bf7-b710-c0f7ced47212

---

## 13. AAB ファイル名

`malaysia-stock-ai-concierge-v33-production.aab`

---

## 14. AAB 保存場所

```
docs/review/play-it-aab-m1-bulk-v33/malaysia-stock-ai-concierge-v33-production.aab
```

**Artifact URL:** https://expo.dev/artifacts/eas/KQyeu6Vt2Ik8osnsNxMaXlNNUHhBDkLa9sOazHwhqvU.aab

**サイズ:** 54,636,891 bytes

Manifest: `docs/review/play-it-aab-m1-bulk-v33/manifest.json`

---

## 15. Play Console で次にやること（Owner）

1. Internal testing → **Create new release**
2. v33 AAB をアップロード（Release name: `1.0.0 (33)`）
3. Release notes 例:

```
M1 bulk i18n hotfix: Portfolio, Home, Stock Check headers, AI Chat chrome, Settings, Rakuten Import, and glossary now follow app language (ja/en/zh-Hans). Pro/FV panels hidden in Standard mode.
```

4. Rollout 後、Settings > Language → **English** / **简体中文**
5. Standard モードで確認:
   - Portfolio: Holdings labels / sell-all / price sync
   - Home: CTA / trust alerts / onboarding
   - Stock Check: section headers（スコア行は M2）
   - AI Chat: proposals/digest（Monte Carlo 等は非表示）
   - Settings: display mode / API keys / reset / Rakuten row

---

## 16. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Hotfix commit** | （push 後に記録） |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

---

## 17. push 結果

| 項目 | 値 |
|------|-----|
| **Push** | （push 後に記録） |

---

## 18. 制約遵守・残存リスク

**制約遵守:** M2 禁止 · 新機能なし · UI デザイン変更なし · Pro 監査は Standard 非表示

**意図的に残す（M2 / F / 深部 Settings）:**

- 通知 `titleJa`/`messageJa`、材料スコア生成行
- Settings 内 X/News API テスト詳細 UI（開発者向け）
- `marketData.ts` 定数本体（呼び出し側は i18n 化済み箇所あり）
- Phase 詳細パネル（Pro モードのみ）

**残存リスク:** 静的監査 147 件 — 主に Settings 深部テスト UI・MaterialAnalysis データ行・constants。実機 M1 主要ラベル層は大幅改善。

---
