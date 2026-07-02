# M1 Settings API / Market Hotfix — v36 Report

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**versionCode:** 36  
**Play IT target:** Internal Testing release `1.0.0 (36)`

---

## 1. v35 residual Japanese / untranslated (device feedback)

### Settings — API test rows

| Observed (en / zh-Hans UI) | Category |
|---|---|
| `News API テスト` | A |
| `失敗時 RSS フォールバック` | B |
| `X API search/recent テスト` / `X API テスト` | A |
| `接続成功` / `接続失敗` / `取得件数` / `テスト日時` | B |
| `保存` / `削除` / `接続テスト` (mixed with en keys) | A |
| `保存状態: 設定済み` / `接続状態: 未テスト` (partial i18n) | B |
| `Bearer Token（留空=保留现有密钥）` placeholder mix | B |

### Settings — nav rows

| Observed | Category |
|---|---|
| `バルサ・マレーシア` (market subtitle) | A |
| `実運用分析モード` (practice mode subtitle) | A |
| Nav titles mostly i18n'd but subtitles still JA constants | B |
| Rakuten row subtitle JA phrasing in en UI (`入金/買入/売出`) | B |

---

## 2. Root cause

### API test UI

- `SettingsScreen.tsx` X/News API diagnostic blocks used hardcoded Japanese labels, status text, and `failureKindLabelJa()` for on-screen display.
- `onSaveApiKey` reset connection message to `'未テスト'` instead of `t('common.notTested')`.
- Initial `apiConnectionMessages` state used `'未確認'` (Japanese).

### Nav rows

- Market subtitle read `MARKET_LABEL` from `rakutenTrade.ts` (Japanese-only: `バルサ・マレーシア`).
- Practice mode subtitle read `APP_MODE_*_LABEL` from `platformClarification.ts` (Japanese-only: `実運用分析モード` / `練習モード`).

Nav title keys (`nav.*`) were already present in en/zh-Hans `settings.json`; visible leaks were primarily **dynamic subtitles** and **inline API test blocks**.

---

## 3. Fix scope

| Area | Action |
|---|---|
| API test UI (X + NewsAPI blocks) | Full i18n via `settings.apiTest.*` keys |
| Connection/save/delete buttons | Already on `common.*` / `apiKeys.*`; fixed state reset leak |
| Market nav subtitle | `getMarketLabelI18n()` |
| Practice mode nav subtitle | `appMode.practice` / `appMode.liveAnalysis` |
| Error reason display | `formatApiTestErrorReason()` — no raw `errorReasonJa` in en/zh-Hans |
| Tests | Settings literal scan + zh-Hans JA phrase guard |
| versionCode | 36 |

No new features. No UI layout changes. Pro-only Phase nav rows unchanged (out of M1 Standard scope).

---

## 4. Settings API test UI changes

### New utility: `src/utils/settingsDisplayI18n.ts`

- `getMarketLabelI18n(t, market)`
- `getNewsApiFailureKindLabelI18n(t, kind)`
- `formatApiTestErrorReason(t, reasonJa, reason)` — locale guard for diagnostic text
- `formatApiTestLocaleDateTime(iso, locale)`

### New i18n namespace: `settings.apiTest.*` (ja / en / zh-Hans)

| Key area | English example |
|---|---|
| `xSearchRecentTitle` | X API search/recent test |
| `newsApiTest` | News API test |
| `newsAuthHint` | … RSS fallback on failure |
| `connectionSuccess` / `connectionFailure` | Connected / Connection failed |
| `rssFallbackSuccess` | RSS fallback: success ({{count}} items) |
| `failureKinds.*` | Localized NewsAPI failure classification |

### Expected display (English)

- News API test button → **News API test**
- RSS hint → **RSS fallback on failure**
- Saved line → **Saved: Configured (****)**
- Connection line → **Connection: Not tested**
- Buttons → **Save** / **Delete** / **Test connection**

### Expected display (zh-Hans)

- News API test → **News API 测试**
- RSS hint → **失败时使用 RSS 备用方案**
- Saved → **保存状态：已设置**
- Connection → **连接状态：未测试**
- Buttons → **保存** / **删除** / **连接测试**

---

## 5. Settings nav row changes

### New i18n keys

| Key | English | zh-Hans |
|---|---|---|
| `markets.bursa` | Bursa Malaysia | 马来西亚交易所（Bursa Malaysia） |
| `markets.us` | United States | 美国 |
| `markets.hk` | Hong Kong | 香港 |
| `appMode.practice` | Practice mode | 练习模式 |
| `appMode.liveAnalysis` | Live analysis mode | 实盘分析模式 |
| `rakutenRow.subtitle` | Manually record deposit / buy / sell (saved after confirmation) | 手动记录入金/买入/卖出（确认后保存） |

### Wiring (`SettingsScreen.tsx`)

- Market settings subtitle: `getMarketLabelI18n(t, selectedMarket)`
- Practice mode subtitle: `t('appMode.practice')` / `t('appMode.liveAnalysis')`

---

## 6. Static leak scan results

| Check | Result |
|---|---|
| `SettingsScreen.tsx` — detailed settings JA literals | PASS |
| `SettingsScreen.tsx` — Standard API/market JA literals | PASS |
| `zh-Hans/settings.json` — kana / JA-only phrases | PASS |
| `en` / `zh-Hans` JSON kana scan (all namespaces) | PASS |
| M1 component JSX JA string scan | PASS |

---

## 7. Unit test results

```
npx vitest run tests/unit/i18n
Test Files  5 passed (5)
Tests       34 passed (34)
```

New/extended coverage in `m1VisibleJaLeakScan.test.ts`:

- Required keys for `markets.*`, `appMode.*`, `apiTest.*`, `rakutenRow.*`
- Runtime English + zh-Hans resolution assertions
- Settings Standard-mode JA literal guard (line-filtered, excludes console/internal state)
- zh-Hans settings JA phrase detection (kana + known JA fragments)

---

## 8. Typecheck results

```
npm run typecheck
```

**Pre-existing errors only** (unchanged by v36):

- `bursaPhase24Analysis.ts`, `newsApiClient.ts`, `storage.ts`
- `beginnerMaterialSummaryBuilder.test.ts`, `bursaPhase11E2e.test.ts`, `conciergeTodayProposalsBuilder.test.ts`, `naturalLanguageParser.test.ts`

No new TypeScript errors from v36 Settings i18n changes.

---

## 9. Build artifacts

| Field | Value |
|---|---|
| **versionCode** | 36 |
| **EAS build ID** | `d23bb753-1cb8-43ea-b64b-c559bc085df2` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/d23bb753-1cb8-43ea-b64b-c559bc085df2 |
| **AAB filename** | `malaysia-stock-ai-concierge-v36-production.aab` |
| **AAB path** | `docs/review/play-it-aab-m1-en-ja-leak-v36/malaysia-stock-ai-concierge-v36-production.aab` |
| **Artifact URL** | https://expo.dev/artifacts/eas/ftFZKWcVl8sCPZZaAhNamdI2hcBbvnJhmd11geMxE-g.aab |

---

## 10. Play Console — next steps

1. Upload `malaysia-stock-ai-concierge-v36-production.aab` to Internal Testing.
2. Promote release `1.0.0 (36)`.
3. Verify on device (English + 简体中文):
   - Settings → API key section: News/X test blocks fully localized
   - Settings nav: market subtitle shows **Bursa Malaysia** / **马来西亚交易所**
   - Practice mode row shows **Live analysis mode** / **实盘分析模式**
   - No hiragana/katakana visible in Standard mode Settings

---

## 11. Git

| Field | Value |
|---|---|
| **Commit hash** | _(see git log after push)_ |
| **Push** | `origin/cursor/top3-maxdd-capital-audit` |

---

## 12. Files changed

- `app.json` — versionCode 36
- `src/screens/SettingsScreen.tsx` — API test i18n, nav subtitles, state fixes
- `src/utils/settingsDisplayI18n.ts` — new display helpers
- `src/i18n/resources/en/settings.json` — markets, appMode, apiTest
- `src/i18n/resources/zh-Hans/settings.json` — markets, appMode, apiTest
- `src/i18n/resources/ja/settings.json` — markets, appMode, apiTest
- `tests/unit/i18n/m1VisibleJaLeakScan.test.ts` — Settings API/market guards
- `docs/review/play-it-aab-m1-en-ja-leak-v36/malaysia-stock-ai-concierge-v36-production.aab`
