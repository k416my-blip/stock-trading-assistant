# MULTI_LANGUAGE_M1_HOME_AI_CARD_HOTFIX_V30_REPORT

**Retry日時:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** Home AI advice card 残存日本語のみ · versionCode **30** · M2禁止

---

## 1. 不具合概要

Play Store Internal Testing **v29** 実機確認で、Settings > Language を **English** / **简体中文** に切り替えても、Home の **AI advice card**（`BeginnerTodayAdviceCard`）が日本語のまま残る。

**報告された残存文言（v29）:**

| 項目 | 日本語（固定） |
|------|----------------|
| カードタイトル | 今日のAIアドバイス |
| ローディング | AIアドバイスを取得中… |

v29 レポートでは proposal card 本文を M1 out-of-scope としていたが、実機上 Home の主要表示のため **M1 Hotfix 対象に変更**。

---

## 2. 原因

`BeginnerTodayAdviceCard.tsx` が UI 文言を **日本語ハードコード** しており、`useTranslation('home')` を使用していなかった。

| 箇所 | 原因 |
|------|------|
| タイトル / ローディング | 文字列リテラル直書き |
| 空状態・フッター・新規購入サマリー・CTA | 同上 + `MATERIAL_CTA_FROM_HOME_JA` 定数 |
| 銘柄行 | `lineJa`（builder 生成の日本語）をそのまま表示 |

タブラベル等は v29 で i18n 化済みのため、**当該カードのみ**が言語切替に追随していなかった。

### AI Concierge 再スキャン（参考）

`AiAssistantChat.tsx` に OCR エラー・タイムアウト等の **エッジケース日本語** が残存。今回スコープ外（M1 主要 UI ではない）。本 Hotfix では未変更。

---

## 3. 修正ファイル

| ファイル | 変更 |
|----------|------|
| `src/components/beginner/BeginnerTodayAdviceCard.tsx` | `useTranslation('home')` + 動的行ラベル |
| `src/i18n/resources/ja/home.json` | `todayAiAdvice.*` 追加 |
| `src/i18n/resources/en/home.json` | 同上 |
| `src/i18n/resources/zh-Hans/home.json` | 同上 |
| `app.json` | `versionCode` **30** |
| `tests/unit/i18n/homeTodayAiAdvice.test.ts` | リソース・runtime テスト追加 |

---

## 4. 修正内容

### 4.1 i18n キー（`home.todayAiAdvice`）

| キー | ja | en | zh-Hans |
|------|----|----|---------|
| `title` | 今日のAIアドバイス | Today's AI advice | 今日AI建议 |
| `loading` | AIアドバイスを取得中… | Loading AI advice... | 正在获取AI建议... |
| `empty` | 保有銘柄や材料データがまだありません | No holdings or material data yet | 尚无持仓或材料数据 |
| `newPurchaseAvailable` | 新規購入候補あり | New buy candidates available | 有新买入候选 |
| `noNewPurchase` | 新規購入  なし | No new purchases | 无新买入 |
| `footer` | 急いで売買する必要はありません | No need to rush trades | 无需急于买卖 |
| `cta` | 銘柄チェックで詳しく見る | View details in Stock Check | 在股票检查中查看详情 |
| `lineHoldHeld` / `lineHold` / `lineMonitor` / `lineBuyCandidate` / `linePass` | （日本語行テンプレート） | （英語） | （简体中文） |

### 4.2 コンポーネント

- タイトル・ローディング・空状態・フッター・CTA を `t('todayAiAdvice.*')` に置換
- 銘柄行は `judgment` + `isHeld` から i18n キーを選択（`lineJa` 非使用）
- 銘柄名（`nameJa`）はデータ由来のため **そのまま**（M2 範囲外）

---

## 5. ja / en / zh-Hans 期待表示

| ロケール | カードタイトル | ローディング |
|----------|----------------|--------------|
| ja | 今日のAIアドバイス | AIアドバイスを取得中… |
| en | Today's AI advice | Loading AI advice... |
| zh-Hans | 今日AI建议 | 正在获取AI建议... |

---

## 6. AI相談タブ言語確認

| 項目 | 結果 |
|------|------|
| v29 で i18n 化済みの主要 UI | 変更なし |
| OCR / エラー系日本語 | **未修正**（本 Hotfix スコープ外） |
| 実機確認 | **Owner 実施待ち**（v30 Play IT 更新後） |

---

## 7. unit test 結果

```text
npx vitest run tests/unit/i18n
```

| 結果 | 詳細 |
|------|------|
| **PASS** | 7/7（`appLanguage.test.ts` 5 + `homeTodayAiAdvice.test.ts` 2） |

---

## 8. typecheck 結果

```text
npm run typecheck
```

| 結果 | 詳細 |
|------|------|
| **既存エラーのみ** | 新規 i18n 由来エラー **なし** |

---

## 9. versionCode 30 確認

| 項目 | 値 |
|------|-----|
| `app.json` | **30** |
| EAS `appBuildVersion` | **30** |

---

## 10. EAS build ID

`cfc82323-c904-4dc6-964d-091bb6bd0f92`

---

## 11. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/cfc82323-c904-4dc6-964d-091bb6bd0f92

---

## 12. AAB ファイル名

`malaysia-stock-ai-concierge-v30-production.aab`

---

## 13. AAB 保存場所

```
docs/review/play-it-aab-m1-home-ai-card-v30/malaysia-stock-ai-concierge-v30-production.aab
```

（52,615,744 bytes · git 未コミット · ローカル + Expo artifact URL）

**Artifact URL:** https://expo.dev/artifacts/eas/VBrnGNVZQl_OsI2PauPEPUZmBVTDcH-0L8lk8QP07II.aab

---

## 14. Play Console で次にやること（Owner）

1. Play Console → **Release → Testing → Internal testing**
2. **Create new release** → v30 AAB をアップロード
3. **Release name:** `1.0.0 (30)`
4. **Release notes（EN 例）:**

```
M1 hotfix: Home AI advice card now follows app language (ja/en/zh-Hans).
```

5. **Start rollout to Internal testing**
6. 実機で Settings > Language を ja / en / zh-Hans 切替 → Home AI card タイトル・ローディングが各言語になることを確認

---

## 15. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Hotfix commit** | `2740f19` — Fix Home AI advice card i18n for M1 hotfix (v30). |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

**注:** EAS build `cfc82323-…` はコミット前のローカル変更をアップロード（EAS メタ `gitCommitHash`: `b5dde5b`）。ソース内容は `2740f19` と同一。

---

## 16. push 結果

| 項目 | 値 |
|------|-----|
| **Push** | **success** — `b5dde5b..2740f19` → `origin/cursor/top3-maxdd-capital-audit` |

---

**制約遵守:** 新機能追加なし · M2 i18n なし · UI デザイン変更なし · Home AI advice card 文言 i18n のみ
