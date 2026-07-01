# Multi-Language M1 Hotfix v29 Report

**Date:** 2026-07-01  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Scope:** M1 i18n only — no M2, no new features, no UI redesign  
**Target:** Play Store Internal Testing production AAB **versionCode 29**

---

## 1. Bug summary

Play Store Internal Testing **versionCode 28** (standalone, no Metro) failed to switch UI language from Settings:

1. **ja → en** — Home/Settings/tabs did not fully switch to English.
2. **ja → zh-Hans** — did not switch to Simplified Chinese.
3. **AI Concierge tab** — even when English was selected, input placeholder, status lines, quick actions, and panel chrome remained Japanese (hardcoded `AI_UI` / Japanese constants).

Prior M1 fixes (Metro debug, versionCode 27) passed; production standalone v28 regressed because lazy runtime subtree and AI Concierge chrome were not fully remounted / i18n-wired for release builds.

---

## 2. Root cause analysis

| Layer | Finding |
|-------|---------|
| **AsyncStorage `@sta/app_language_v1`** | Storage read/write was correct; not the primary failure. |
| **AppLanguageContext** | `setAppLanguage` order was `i18n → save → state`. Prior fix spec was `save → i18n → state`. Corrected. |
| **`i18n.changeLanguage`** | Awaited correctly; `nonExplicitSupportedLngs` + `load: 'currentOnly'` already present. |
| **Navigation remount** | `NavigationContainer` + `Tab.Navigator` keys existed, but **`LazyInteractiveRuntime` in `App.tsx` had no locale key** — React.lazy subtree could retain stale screen trees in standalone Hermes builds after language change. |
| **Tab titles** | `tabTitleForAppUxMode()` called module-level `i18n.t()` without `useTranslation` subscription; fixed to accept `t` from `MainTabNavigator`. |
| **AI Concierge UI** | `AiAssistantChat.tsx` used hardcoded Japanese from `constants/aiStrategyBriefing.ts` (`AI_UI`, `AI_SAMPLE_QUESTIONS`) for placeholder, send button, status banners, analysis mode, panel titles, welcome message, beginner quick actions. |
| **AI system prompt** | `buildConciergeChatInstructions()` already uses `getCurrentAppLanguage()` via `RESPONSE_LANGUAGE_RULE` — OK once UI locale actually updates. |

**Primary root cause:** incomplete remount of the lazy interactive runtime + hardcoded Japanese in AI Concierge chrome (not missing Home/Settings i18n keys).

---

## 3. Changed files list

| File | Change |
|------|--------|
| `App.tsx` | `LazyInteractiveRuntime key={runtime-${appLanguage}-${languageRevision}}` |
| `app.json` | `android.versionCode` → **29** |
| `eas.json` | `production.autoIncrement` → **false** (prevent EAS bumping 29→30) |
| `src/context/AppLanguageContext.tsx` | `save → changeAppLanguage → state → languageRevision` |
| `src/navigation/beginnerTabNavigatorConfig.ts` | `tabTitleForAppUxMode(..., t)` uses subscribed `TFunction` |
| `src/navigation/MainTabNavigator.tsx` | Pass `t` into `tabTitleForAppUxMode` |
| `src/components/AiAssistantChat.tsx` | `useTranslation('concierge')`; i18n for composer, status, panels, structured labels; remount key |
| `src/components/beginner/BeginnerConciergeQuickActions.tsx` | i18n labels/seeds |
| `src/data/mockAiChat.ts` | Welcome message via `i18n.t('concierge:welcomeMessage')` |
| `src/i18n/resources/{ja,en,zh-Hans}/concierge.json` | +40 M1 chrome keys |
| `tests/unit/appUxMode.test.ts` | Updated for new `tabTitleForAppUxMode` signature |

---

## 4. Fix details

1. **Language switch pipeline:** persist locale first, then `changeAppLanguage`, then bump `languageRevision`.
2. **Full runtime remount:** `LazyInteractiveRuntime` keyed by locale + revision forces standalone rebuild of navigator + lazy tab screens.
3. **Tab labels:** resolved through `useTranslation`-bound `t()` at render time.
4. **AI Concierge chrome:** placeholder, Send, API status, mock banners, analysis mode chips, panel section titles, delivery meta, beginner quick actions, welcome bubble → `concierge` namespace (ja/en/zh-Hans).
5. **Chat reset on locale change:** `AiAssistantChat` resets messages + remount key on `appLanguage` / `languageRevision`.

**M1-out-of-scope (documented, not changed):** Settings menu Japanese rows, Home AI proposal cards, stack screen titles in `RootNavigator`, non-concierge `AiAssistantChat` header (`AI_CHAT_TITLE`), AI response body text from API, `aiStrategyBriefing.ts` constants used outside Concierge tab, startup shell Japanese strings in `App.tsx`.

---

## 5. ja / en / zh-Hans device verification results

| Locale | Home | Settings | AI tab | Result |
|--------|------|----------|--------|--------|
| **ja** | — | — | — | **BLOCKED** — no adb device attached |
| **en** | — | — | — | **BLOCKED** — no adb device attached |
| **zh-Hans** | — | — | — | **BLOCKED** — no adb device attached |

`adb devices` returned empty. Owner should install v29 AAB on Play IT and verify the three locales manually.

---

## 6. AI Concierge tab language verification

| Check | Expected (en) | Device |
|-------|---------------|--------|
| Screen title/subtitle | `AI Chat` / `Ask anything you're unsure about` | BLOCKED |
| Input placeholder | English placeholder | BLOCKED |
| Send button | `Send` | BLOCKED |
| Welcome bubble | English welcome | BLOCKED |
| Quick actions (beginner) | English labels | BLOCKED |
| Status banners | English when AI off/mock | BLOCKED |

Code path verified via i18n keys + remount logic; standalone device smoke pending Owner.

---

## 7. Unit test results

```
✓ tests/unit/i18n/appLanguage.test.ts (5 tests) PASS
✓ tests/unit/appUxMode.test.ts (8 tests) PASS — includes tabTitleForAppUxMode with t()
```

---

## 8. Typecheck results

`npm run typecheck` — **pre-existing errors only** (unchanged, not introduced by this hotfix):

- `src/services/bursa/bursaPhase24Analysis.ts`
- `src/services/newsApiClient.ts`
- `src/services/storage.ts`
- `tests/unit/beginnerMaterialSummaryBuilder.test.ts`
- `tests/unit/bursaPhase11E2e.test.ts`
- `tests/unit/conciergeTodayProposalsBuilder.test.ts`
- `tests/unit/rakutenImport/naturalLanguageParser.test.ts`

**No new i18n-related typecheck errors.**

---

## 9. versionCode 29 confirmation

- `app.json`: `"versionCode": 29`
- EAS production `autoIncrement: false` (first build attempt auto-bumped to 30 — canceled; rebuild used 29)
- Build profile: `production` (AAB / store)

---

## 10. EAS build ID

`9bf999b2-31f3-481a-bc0e-3e6862dfbc70`

(Canceled erroneous build with auto-increment: `a3d0adcf-38b5-4bad-b17e-e2607e2fa09d`)

---

## 11. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/9bf999b2-31f3-481a-bc0e-3e6862dfbc70

---

## 12. AAB filename

`malaysia-stock-ai-concierge-v29-production.aab`

---

## 13. AAB save location

`docs/review/play-it-aab-m1-hotfix-v29/malaysia-stock-ai-concierge-v29-production.aab` (54,614,823 bytes)

Manifest: `docs/review/play-it-aab-m1-hotfix-v29/manifest.json`

Download: `curl -L -o malaysia-stock-ai-concierge-v29-production.aab "https://expo.dev/artifacts/eas/S24cga3b8LIjl7HnXOqTcDElfRfrJx2KKXkYakUrK-4.aab"`  
(`eas-cli build:download` returned `TAR_BAD_ARCHIVE` — direct artifact URL used.)

**.aab not committed** (large binary; path documented only).

---

## 14. Play Console next steps for Owner

1. Open Play Console → Internal Testing track.
2. Create new release; upload `malaysia-stock-ai-concierge-v29-production.aab`.
3. Confirm **version code 29** in release summary.
4. Roll out to internal testers.
5. On device (no Metro): Settings → Language → test **ja**, **en**, **zh-Hans** across Home, Settings, Stock Check, AI Concierge (placeholder + Send + welcome).
6. Report any remaining Japanese-only strings (M2 backlog).

---

## 15. GitHub commit hash

*(filled after commit — see push step)*

---

## 16. Push result

*(filled after push)*

---

*M1 hotfix v29 — language switch + AI Concierge chrome i18n · M2 not started*
