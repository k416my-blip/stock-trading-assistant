# MULTI_LANGUAGE_ZH_LOCALE_HOTFIX_V31_REPORT

**日付:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** zh-Hans ロケール解決のみ · versionCode **31**

---

## 1. 不具合概要

Play Store Internal Testing **v30** 実機確認:

- **English** 切替 → 改善済み
- **简体中文** 切替 → **日本語のまま**（Home / Settings / AI Chat 等）

---

## 2. 原因分析

| 要因 | 詳細 |
|------|------|
| **i18next と `zh-Hans` タグ** | リソースは `'zh-Hans'` キーのみ。i18next が `zh` / `zh-CN` に正規化した際、バンドル未ヒット → **fallbackLng `ja`** |
| **保存値の厳格判定** | `loadAppLanguage()` が `'zh-Hans'` 完全一致のみ受理。端末・旧版が `zh` / `zh-CN` で保存していた場合 **null → 日本語** |
| **端末 locale 推定不足** | `deviceLocaleSuggestion()` が `languageCode === 'zh'` のみ。`zh-CN` タグ未対応 |

---

## 3. zh-Hans が切り替わらなかった理由

Settings で 简体中文 を押しても、i18next 内部で `zh-Hans` リソースが解決されず **日本語 fallback** が使われていた。加えて AsyncStorage に `zh-CN` 等が保存されている場合、読み込み時に reject され初期 locale が ja に戻る経路もあった。

---

## 4. 修正ファイル一覧

| ファイル | 変更 |
|----------|------|
| `src/types/appLanguage.ts` | `normalizeAppLanguage()` 追加 |
| `src/services/appLanguageStorage.ts` | load/save で normalize |
| `src/i18n/index.ts` | init/change で normalize · fallbackLng · cleanCode |
| `src/i18n/config.ts` | `I18N_SUPPORTED_LNGS`（zh エイリアス） |
| `src/i18n/resources/index.ts` | `zh` / `zh-CN` を zh-Hans バンドルにエイリアス |
| `src/context/AppLanguageContext.tsx` | 端末 locale · setAppLanguage で normalize |
| `app.json` | versionCode **31** |
| `tests/unit/i18n/normalizeAppLanguage.test.ts` | 新規 |

---

## 5. normalizeAppLanguage の仕様

| 入力 | 出力 |
|------|------|
| `ja`, `ja-JP`, `japanese` | `ja` |
| `en`, `en-US`, `en-MY`, `english` | `en` |
| `zh`, `zh-CN`, `zh-Hans`, `zh_Hans`, `chinese`, `simplified-chinese` | `zh-Hans` |
| `fr`, 空, null | `null` |

**保存:** 常に `@sta/app_language_v1` = **`zh-Hans`**（正規化後）

**i18next:** resources に `zh-Hans` / `zh` / `zh-CN` を同一バンドルで登録。`fallbackLng` で `zh` → `zh-Hans` → `ja`。

---

## 6. unit test 結果

```text
npx vitest run tests/unit/i18n
```

| 結果 | 詳細 |
|------|------|
| **PASS** | **15/15** |

含むテスト:

- `normalizeAppLanguage('zh') === 'zh-Hans'`
- `normalizeAppLanguage('zh-CN') === 'zh-Hans'`
- storage `zh-CN` → load `zh-Hans`
- `changeAppLanguage('zh-CN')` → `i18n.language === 'zh-Hans'` · `home:todayAiAdvice.title === '今日AI建议'`

---

## 7. typecheck 結果

```text
npm run typecheck
```

| 結果 | 詳細 |
|------|------|
| **既存エラーのみ** | 新規 i18n 由来エラー **なし** |

---

## 8. versionCode 31 確認

| 項目 | 値 |
|------|-----|
| `app.json` | **31** |
| EAS `appBuildVersion` | **31** |
| EAS `gitCommitHash` | `92f983e` |

---

## 9. EAS build ID

`0decfea3-e328-4fbb-baef-483005bbcb4f`

---

## 10. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/0decfea3-e328-4fbb-baef-483005bbcb4f

---

## 11. AAB ファイル名

`malaysia-stock-ai-concierge-v31-production.aab`

---

## 12. AAB 保存場所

```
docs/review/play-it-aab-zh-locale-v31/malaysia-stock-ai-concierge-v31-production.aab
```

**Artifact URL:** https://expo.dev/artifacts/eas/qHEqsldRLlHAO_SuNx99NmdzbE-e8RT2BVf78Z7y4Bs.aab

---

## 13. Play Console で次にやること（Owner）

1. Internal testing → **Create new release**
2. v31 AAB をアップロード（Release name: `1.0.0 (31)`）
3. Release notes 例:

```
M1 hotfix: Simplified Chinese (zh-Hans) locale resolution fixed.
```

4. Rollout 後、Settings > Language → **简体中文**
5. 確認: Home タブ「首页」、Settings 中国語、AI card「今日AI建议」

---

## 14. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Hotfix commit** | `92f983e` — Fix zh-Hans locale normalization for M1 i18n (v31). |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

---

## 15. push 結果

（push 後に追記）

---

**制約遵守:** M2 禁止 · 新機能なし · UI デザイン変更なし · zh-Hans ロケール解決のみ
