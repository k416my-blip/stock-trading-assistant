# Multi-Language Phase M1 Implementation Report

**Date:** 2026-06-21  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Scope:** Play IT i18n M1 (ja / en / zh-Hans) — not full app i18n

---

## 1. Implementation Summary

| Item | Status |
|------|--------|
| **Stack** | `i18next` + `react-i18next` + `expo-localization` (Expo SDK 54) |
| **Default locale** | `ja` |
| **Storage key** | `@sta/app_language_v1` |
| **First-launch picker** | `LanguagePickerModal` (日本語 / English / 简体中文) |
| **Settings language section** | Before display mode; immediate switch |
| **AI Concierge response language** | `RESPONSE_LANGUAGE_RULE` in `buildConciergeChatInstructions` |
| **Tab label refresh** | `key={appLanguage}` on `Tab.Navigator` + `i18n.t()` in `tabTitleForAppUxMode` |
| **versionCode** | **27** |
| **Excluded** | Pro screens, Forward Validation panels (not translated) |

### Architecture

```
src/i18n/
  index.ts, config.ts
  resources/{ja,en,zh-Hans}/*.json  (9 namespaces)
src/context/AppLanguageContext.tsx
src/services/appLanguageStorage.ts
src/types/appLanguage.ts
src/components/LanguagePickerModal.tsx
```

### Namespaces

`common`, `navigation`, `home`, `portfolio`, `stockCheck`, `concierge`, `settings`, `rakutenImport`, `errors`

### Screens translated (M1)

- Home (`HomeScreen`)
- Portfolio (`PortfolioScreen` — beginner + standard headers/empty state)
- Stock Check (`MaterialAnalysisScreen` — tab label path + page title/loading)
- AI Concierge (`ConciergeTabScreen`, `AiAssistantChat` status strings)
- Settings (`SettingsScreen` — title/subtitle + language section)
- Rakuten Import (3 screens + `ConciergeImportActionCard`)

---

## 2. Test Results

| Test | Result |
|------|--------|
| `npx vitest run tests/unit/i18n` | **PASS** (4/4) |
| `npx vitest run tests/unit/appUxMode.test.ts` | **PASS** (8/8) |
| `npm run typecheck` | Pre-existing repo errors remain; **no new i18n-specific TS errors** in changed files |

---

## 3. Screenshot Paths (device capture)

Base: `docs/review/i18n-m1-screenshots/`

| Locale | Home | Portfolio | Stock Check | Concierge | Settings |
|--------|------|-----------|-------------|-----------|----------|
| ja | `ja-home.png` | `ja-portfolio.png` | `ja-stockcheck.png` | `ja-concierge.png` | `ja-settings.png` |
| en | `en-home.png` | `en-portfolio.png` | `en-stockcheck.png` | `en-concierge.png` | `en-settings.png` |
| zh-Hans | `zh-Hans-home.png` | `zh-Hans-portfolio.png` | `zh-Hans-stockcheck.png` | `zh-Hans-concierge.png` | `zh-Hans-settings.png` |

Capture script: `node scripts/capture-i18n-m1-screenshots.mjs`

---

## 4. APK Info

| Field | Value |
|-------|-------|
| **Artifact** | `artifacts/preview-v27-i18n-m1.apk` (local; gitignored) |
| **Gradle output** | `android/app/build/outputs/apk/debug/app-debug.apk` |
| **versionCode** | 27 |
| **Package** | `com.assistant.stocktrading` |
| **Build** | `npx expo prebuild --platform android --no-install` + `gradlew :app:assembleDebug` |
| **Device install** | Success (`adb install -r`) |

---

## 5. Git

| Field | Value |
|-------|-------|
| **Commit** | _pending — see post-commit update_ |
| **Push** | _pending_ |

---

## 6. Key Files Changed

- `App.tsx` — `AppLanguageProvider`, language gate before interactive runtime
- `src/navigation/beginnerTabNavigatorConfig.ts`, `MainTabNavigator.tsx`
- `src/services/aiPersonalityGuard.ts` — locale response rule
- `package.json` — i18n dependencies
- `app.json` — versionCode 27, `expo-localization` plugin
- `tests/unit/i18n/appLanguage.test.ts`
- `scripts/capture-i18n-m1-screenshots.mjs`
