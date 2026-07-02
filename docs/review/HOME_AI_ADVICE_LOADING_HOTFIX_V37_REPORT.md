# Home AI Advice Loading Hotfix — v37 Report

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**versionCode:** 37  
**Play IT target:** Internal Testing release `1.0.0 (37)`

---

## 1. Bug summary

On Play Store Internal Testing v36 (standalone APK, no Metro):

- Home → **Today's AI advice** card stayed on **"AIアドバイスを取得中…"** indefinitely
- Repro: 0 holdings, portfolio score 50/100, no deposit plan
- Not an i18n issue — loading state never cleared

---

## 2. Root cause

`HomeScreen` derived card loading from:

```typescript
loading: materialCtx?.loading === true && !materialCtx?.report
```

`BursaMaterialContext` initializes `loading: true` and only clears it after `refresh()` completes in `finally`. On standalone installs:

1. Material fetch can hang (API timeout / no keys / slow network), or
2. `appLoading` delay prevents `refresh()` from starting while `loading` remains `true`

With no timeout and no error-path guard in Home, the advice card stayed in loading forever even when holdings = 0 and no advice could be generated.

---

## 3. Fix scope

| File | Change |
|---|---|
| `src/services/beginner/beginnerTodayAdviceBuilder.ts` | `resolveTodayAdviceCardLoading()` + 9s timeout constant |
| `src/hooks/useBeginnerTodayAdviceCardData.ts` | **New** — timeout + safe loading resolution for Home |
| `src/screens/HomeScreen.tsx` | Use hook instead of inline `useMemo` loading |
| `src/components/beginner/BeginnerTodayAdviceCard.tsx` | Empty state shows `empty` + `emptyHint`; hide purchase/footer when empty |
| `src/i18n/resources/*/home.json` | Updated empty copy + new `emptyHint` key |
| `tests/unit/i18n/homeTodayAiAdvice.test.ts` | Loading resolver + empty state tests |

No new features. No layout redesign.

---

## 4. Loading release logic

### `resolveTodayAdviceCardLoading()`

Loading is **false** when any of:

- Safety timeout elapsed (`timedOut === true`, 9 seconds)
- Material context unavailable (`materialCtx == null`)
- Material report arrived
- Material error set
- `materialLoading !== true`

Loading is **true** only while material fetch is actively pending and none of the above apply.

### `useBeginnerTodayAdviceCardData` hook

```typescript
useEffect(() => {
  if (!materialPending) { setTimedOut(false); return; }
  setTimedOut(false);
  const timer = setTimeout(() => setTimedOut(true), 9000);
  return () => clearTimeout(timer);
}, [materialPending, ...]);
```

Ensures standalone APK always exits loading within ~9 seconds.

---

## 5. Empty / fallback display

When `loading === false` and `lines.length === 0`:

| Locale | Title | Empty | Hint |
|---|---|---|---|
| ja | 今日のAIアドバイス | 現在、AIアドバイスはありません | 入金額または保有銘柄を追加すると、AIが提案を作成します |
| en | Today's AI advice | No AI advice yet | Add a deposit amount or holdings to generate advice |
| zh-Hans | 今日AI建议 | 暂无AI建议 | 添加入金金额或持仓后，AI会生成建议 |

Applies to: holdings 0, proposals 0, API failure, timeout, missing API key.

---

## 6. Unit test results

```
npx vitest run tests/unit/i18n
Test Files  5 passed (5)
Tests       38 passed (38)
```

New coverage in `homeTodayAiAdvice.test.ts`:

- `resolveTodayAdviceCardLoading` — pending / timeout / error / report / missing context
- `buildBeginnerTodayAdvice` — holdings 0 returns empty without loading
- ja / en / zh-Hans `empty` + `emptyHint` keys

---

## 7. Typecheck results

```
npm run typecheck
```

**Pre-existing errors only** (unchanged by v37):

- `bursaPhase24Analysis.ts`, `newsApiClient.ts`, `storage.ts`
- `beginnerMaterialSummaryBuilder.test.ts`, `bursaPhase11E2e.test.ts`, `conciergeTodayProposalsBuilder.test.ts`, `naturalLanguageParser.test.ts`

No new TypeScript errors from v37 changes.

---

## 8. Build artifacts

| Field | Value |
|---|---|
| **versionCode** | 37 |
| **EAS build ID** | `e872bf90-873c-4453-a412-3ca02a878f61` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/e872bf90-873c-4453-a412-3ca02a878f61 |
| **AAB filename** | `malaysia-stock-ai-concierge-v37-production.aab` |
| **AAB path** | `docs/review/play-it-aab-home-ai-advice-v37/malaysia-stock-ai-concierge-v37-production.aab` |
| **Artifact URL** | https://expo.dev/artifacts/eas/CnOSGCNujefuFIZ_J9lvO2JCKtRaQe7n58c88rCnNGA.aab |

---

## 9. Play Console — next steps

1. Upload `malaysia-stock-ai-concierge-v37-production.aab` to Internal Testing.
2. Promote release `1.0.0 (37)`.
3. Verify on standalone device (no USB/Metro):
   - Home → Today's AI advice clears loading within ~10 seconds
   - With 0 holdings: shows empty state + hint (not perpetual spinner)
   - Test ja / en / zh-Hans language switch

---

## 10. Git

| Field | Value |
|---|---|
| **Commit hash** | `45dfcf4` |
| **Push** | `origin/cursor/top3-maxdd-capital-audit` ✅ |
