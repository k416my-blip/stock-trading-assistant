# MULTI_LANGUAGE_M1_FINAL_AUDIT_REPORT

**監査日:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Base commit:** `954ebea` (versionCode **32** · **修正なし · AAB なし**)  
**判定:** **FAIL** — English / 简体中文 表示時に M1 対象画面へ日本語が多数残存

---

## 1. エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| 監査方式 | 静的 TSX/i18n スキャン + 実機 `uiautomator` UI テキスト抽出 |
| 実機 | `FYRWXSNNAIOR9DCM` · Play standalone（Internal Testing 系ビルド） |
| 静的検出（A/B/C 相当） | **311 件**（重複含む） |
| 実機 English 検出 | **56 件**（ユニーク 56） |
| 実機 简体中文 検出 | **57 件**（ユニーク 57 · EN と **47 件共通**） |
| **M1 修正必須（A–C 推定）** | **~180 静的 + 実機 UI ラベル層** |
| **M2 / 対象外（D–F 推定）** | 通知本文 · 材料スコア · Pro/検証パネル等 |

**結論:** v32 以降も **UI ラベル・説明・Alert 文言・定数経由メッセージ** に日本語が残る。ユーザー指摘運用を止めるため、次 Hotfix は **本レポートの A–C 一覧を一括修正** する必要がある。

---

## 2. 監査方法

### 2.1 自動監査スクリプト

`scripts/audit-m1-i18n-final.mjs`

| レイヤ | 内容 |
|--------|------|
| **静的 TSX スキャン** | M1 対象ファイル内の文字列リテラルからひらがな/カタカナ/既知日本語 UI フレーズを検出（`t()` 未使用行） |
| **i18n リソーススキャン** | `en` / `zh-Hans` JSON 値に日本語文字が混入していないか（`Rakuten Trade` 等の固有名詞は false positive あり） |
| **実機 UI 抽出** | `adb` → Settings で言語切替 → 各タブ `uiautomator dump` → `text="..."` 抽出 → 日本語検出 |

### 2.2 検出ルール（FAIL 条件）

- ひらがな（`\u3040–\u309F`）
- カタカナ（`\u30A0–\u30FF`）
- 既知 UI フレーズ（例: 銘柄 / 保有 / 通知 / 利益急減 / 本日の / 更新対象 / 株価 / APIキー …）

### 2.3 対象外（監査上スキップまたは D–F 分類）

- Pro 専用タブ・Forward Validation 画面
- 開発者 Debug パネル（AI プロンプト debug 等）
- API/Bursa **生成コンテンツ**（`titleJa` / `messageJa` / 材料スコア文）
- 銘柄名・会社名（MAYBANK / PETRONAS 等）
- **日本語モード** 表示（今回未実施 — en/zh-Hans のみ）

### 2.4 証跡ファイル

| ファイル | 内容 |
|----------|------|
| `docs/review/m1-final-audit/audit-full.json` | 全検出一式 |
| `docs/review/m1-final-audit/device-en-dumps.json` | English UI テキスト一覧 |
| `docs/review/m1-final-audit/device-zh-dumps.json` | 简体中文 UI テキスト一覧 |

---

## 3. 対象画面

| 画面 | モード | 静的スキャン対象 | 実機タブ |
|------|--------|------------------|----------|
| Home | Beginner / Standard | `HomeScreen.tsx` + beginner コンポーネント | Home |
| Portfolio | Beginner / Standard | `PortfolioScreen.tsx`, `HoldingCard.tsx`, price sync | Portfolio |
| Alerts | Standard | `AiNotificationsScreen.tsx` | Alerts |
| Stock Check | Beginner / Standard | `MaterialAnalysisScreen.tsx` | Stock Check |
| AI Chat | Beginner / Standard | `ConciergeTabScreen.tsx`, `AiAssistantChat.tsx`, concierge panels | AI Chat |
| Settings | Standard（M1 範囲） | `SettingsScreen.tsx`（Pro 以降セクションは F 寄り） | Settings |
| Rakuten Import | Settings 経由 | `RakutenImport*.tsx` | （Settings から遷移 · 今回 dump 未巡回） |

---

## 4. English 表示で残った日本語（実機 · ユニーク 56 件 · 代表）

### 4.1 Portfolio（**A/B — 修正必須**）

| 検出テキスト | 分類 | 由来（推定） |
|-------------|------|--------------|
| 今持っている株 | A | `PortfolioScreen.tsx` セクション見出し |
| すべて売却 | A | `PortfolioScreen.tsx` |
| 持っている株を全部売ること | B | `PortfolioScreen.tsx` |
| 保有評価額 / 含み損益 | A | beginner ラベル |
| 今持っている株を、いまの株価で計算した値段 | B | beginner 説明 |
| まだ売っていない株の損益 | B | beginner 説明 |
| 会社からもらえる利益の一部 | B | 配当説明 |
| 手動で保有銘柄に追加 / 配当を記録 / 手動注文リスト | A | `PortfolioScreen.tsx` ボタン |

### 4.2 Stock Check（**A + D 混在**）

| 検出テキスト | 分類 | 由来 |
|-------------|------|------|
| 【データ品質】 / 【市場監視 — 材料通知】 / 【銘柄別材料分析】 | A | `MaterialAnalysisScreen.tsx` 見出し |
| 接続済み | A | ステータスラベル |
| 材料スコア内訳（ソース別） | A | UI 見出し |
| `MALAYAN BANKING… 好材料スコア +100 — 増配` | **D** | Bursa 生成コンテンツ（M2） |
| `Bursa · News API · RSS · X · Reddit（実データのみ）` | B | フッター説明 |

### 4.3 AI Chat（**A + F 混在**）

| 検出テキスト | 分類 | 由来 |
|-------------|------|------|
| OpenAI APIキー未設定 / 履歴スクショ… | A | `AiAssistantChat.tsx` Alert |
| 最近の成功率 / データ不足 / 平均リターン / 検証待ち | **F** | Pro/検証系パネル（Concierge 内） |
| ストレス / Monte Carlo / ベンチマーク比較… | **F** | Forward Validation 系 UI が Standard で可視 |

### 4.4 Alerts（**D — M2 対象**）

| 検出テキスト | 分類 | 由来 |
|-------------|------|------|
| `IOI — 利益急減` / `KUALA — 利益急減` … | **D** | `bursaConciergeNotificationBuilder` 生成 `titleJa` |
| `…純利益が22.3%減少…` | **D** | 通知 `messageJa` |

> v32 で Alerts **UI 見出し**（AI通知 / 通知音 等）は i18n 化済み。実機に残るのは主に **通知本文（D）**。

---

## 5. 简体中文 表示で残った日本語（実機 · ユニーク 57 件）

English と **47/57 件が同一テキスト**（言語切替が UI に反映されていない箇所）。追加で zh-Hans i18n JSON 内に日本語混入 **37 キー**（静的）。

### 5.1 zh-Hans i18n リソース混入（静的 · 要修正 **A**）

`src/i18n/resources/zh-Hans/` 内で日本語文字を含む値が **37 件**（例: 未翻訳キーが ja フォールバック、または zh ファイルに日本語残存）。詳細は `audit-full.json` → `zhI18nLeaks`。

### 5.2 実機 zh-Hans 固有差分（9 件）

English に無い検出 9 件 — いずれも **日本語 UI 固定**（言語設定が効いていないコンポーネント）。一覧: `audit-full.json` → `deviceZh.findings` フィルタ。

---

## 6. 静的スキャン — 画面別サマリー（A/B/C · 重複除去前）

| 画面 | 件数 | 主なソースファイル |
|------|------|-------------------|
| **Settings** | 110 | `SettingsScreen.tsx`（API・更新頻度・リセット UI） |
| **constants** | 76 | `marketData.ts`, `apiSettings.ts`, `appUxMode.ts` |
| **Home** | 29 | `HomeScreen.tsx`, `BeginnerOnboardingModal.tsx` |
| **AI Chat** | 33 | `AiAssistantChat.tsx` |
| **Portfolio** | 41 | `PortfolioScreen.tsx`, `HoldingCard.tsx` |
| **Alerts** | 26 | `AiNotificationsScreen.tsx`（一部 D フィールド除外済み） |
| **Stock Check** | 22 | `MaterialAnalysisScreen.tsx` |
| **Rakuten Import** | 11 | `RakutenImportConfirmScreen.tsx` 等 |

---

## 7. 分類（A–F）

| 分類 | 定義 | 件数（概算） | 対応 |
|------|------|-------------|------|
| **A** | UIラベル / ボタン / 見出し | ~200 | **M1 Hotfix 必須** |
| **B** | 説明文 / ヒント / Alert 本文 | ~80 | **M1 Hotfix 必須** |
| **C** | 通知タイトル（UI 枠） | ~15 | **M1 Hotfix 必須**（ラベル部分） |
| **D** | AI/Bursa 生成コンテンツ | 実機 Alerts 主体 | **M2** — 生成パイプライン多言語化 |
| **E** | 銘柄名・固有名詞 | 少数 | **対象外** |
| **F** | Pro / Debug / 検証パネル | AI Chat 内 ~20 | **対象外**（Standard で非表示化も検討） |

---

## 8. 修正必須ファイル（A–C · 優先度順）

### P0 — 実機で即確認された漏れ

| ファイル | 画面 | 代表文言 |
|----------|------|----------|
| `src/screens/PortfolioScreen.tsx` | Portfolio | 今持っている株 / すべて売却 / 含み損益 |
| `src/components/HoldingCard.tsx` | Portfolio | 再取得中… / この銘柄だけ再取得 / 保有を削除 |
| `src/screens/MaterialAnalysisScreen.tsx` | Stock Check | 【データ品質】 / 【銘柄別材料分析】 |
| `src/screens/HomeScreen.tsx` | Home | AIに相談する / 銘柄検索 / Alert ボタン |
| `src/components/AiAssistantChat.tsx` | AI Chat | OpenAI APIキー未設定 / タイムアウト |

### P1 — 定数経由（複数画面）

| ファイル | 影響 |
|----------|------|
| `src/constants/marketData.ts` | Portfolio price sync 全メッセージ（76 箇所） |
| `src/constants/apiSettings.ts` | Settings API プロモ |
| `src/constants/investmentDisplay.ts` | Home trust モード |
| `src/constants/beginnerTabLabelsJa.ts` | Home CTA |

### P2 — Settings M1 範囲

| ファイル | 備考 |
|----------|------|
| `src/screens/SettingsScreen.tsx` | API キー行・更新頻度・リセット確認（**Pro 監査セクションは F で除外**） |
| `src/screens/RakutenImport*.tsx` | Import フロー全体 |

### P3 — i18n リソース

| パス | 備考 |
|------|------|
| `src/i18n/resources/zh-Hans/*.json` | 37 キーに日本語混入 |
| `src/i18n/resources/en/*.json` | キー欠落 → ja フォールバック経路の洗い出し |

---

## 9. 次 Hotfix 推奨範囲（修正は未実施）

**versionCode 33 想定 · スコープ:**

1. **Portfolio 完全 i18n** — `PortfolioScreen` + `HoldingCard` + `marketData.ts` の M1 可視メッセージを `portfolio.json` へ
2. **Home Standard/Beginner** — `HomeScreen` Alert/CTA/セクション見出し
3. **Stock Check 見出し** — `MaterialAnalysisScreen` 固定見出し（生成スコア行は D として M2）
4. **AI Chat UI chrome** — `AiAssistantChat` Alert/ステータス；Pro パネルは Standard で **非表示**（F 対策）
5. **Settings M1 セクションのみ** — 表示モード/APIキー/更新頻度/Rakuten 行（110 件中 M1 該当 ~40 行を切り分け）
6. **Rakuten Import** — 確認/OCR 画面
7. **zh-Hans JSON 37 キー修正** + 静的リークスキャン CI 強化

**対象外（M2）:** 通知 `titleJa`/`messageJa`、材料スコア文、AI 日次コメント本文

---

## 10. unit test / typecheck

| 項目 | 結果 |
|------|------|
| 監査スクリプト | `node scripts/audit-m1-i18n-final.mjs` — **完了** |
| 既存 `m1VisibleJaLeakScan.test.ts` | v32 時点 8 ファイルのみ — **カバレッジ不足**（本監査で拡張要） |
| 修正 | **未実施**（監査のみ） |

---

## 11. versionCode / AAB

| 項目 | 状態 |
|------|------|
| versionCode | **32 のまま（変更なし）** |
| AAB | **未作成** |

---

## 12. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Commit** | `db2d184` — docs: add M1 i18n final audit report (en/zh-Hans JA leak scan). |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

---

## 13. push 結果

| 項目 | 値 |
|------|-----|
| **Push** | **success** — `954ebea..db2d184` → `origin/cursor/top3-maxdd-capital-audit` |

---

**本レポートは修正前の監査のみ。次ステップは §9 Hotfix 範囲に基づく一括 i18n 修正（ユーザー指摘運用禁止）。**
