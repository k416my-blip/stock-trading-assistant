# M1 Remaining Visible JA Hotfix — v35 Report

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**versionCode:** 35  
**Play IT target:** Internal Testing release `1.0.0 (35)`

---

## 1. v34 residual Japanese (device feedback)

### Alerts / notifications (after ZETRIX)

| Observed (en / zh-Hans UI) | Category |
|---|---|
| `ZETRIX — 削減股息` / `IOI — 削減股息` | C — title suffix not fully localized |
| `ZETRIXが減配しました` / `IOIが減配しました` | C — messageJa shown raw |
| Same pattern for UNITED and later rows | C |

### Settings → Detailed settings section

| Observed | Category |
|---|---|
| `詳細設定` | A |
| `個人利用の説明・初心者ガイド・リスク告知は…` | B |
| `個人利用` / `個人用AI投資OS — …` | A/B |
| `ご自身の検討用のみ — …` | B |
| `モック／閲覧専用のAI提案 — …` | B |
| `このアプリは投資判断を補助する分析ツールです。` | B |
| `実際の注文はRakuten Trade…` | B |
| `現在は分析支援システムとして動作しています` | B |

---

## 2. Root cause

### Alerts

- v34 added display fallbacks for **profit drop** (`利益急減`) messages but not **dividend cut** patterns.
- Generator emits:
  - title: `{SYMBOL} — 減配`
  - message: `{SYMBOL}が減配しました（{reason}）`
- `formatNotificationMessageDisplay()` had no regex for `が減配しました`, so non-ja locales returned raw Japanese.
- Trigger aliases for Chinese dividend suffixes (`削减股息`, `削減股息`) were missing in `alertsI18nHelpers`.

### Settings

- `SettingsScreen` still hardcoded `詳細設定` section title/hint.
- `PersonalUseBanner`, `PlatformClarificationCard`, and `RiskNoticeOrangeBox` read Japanese constants directly (`PERSONAL_USE_*`, `platformClarification` JA constants) with no `useTranslation`.

---

## 3. Fix scope

| Area | Action |
|---|---|
| Alerts title/message | Extended `bursaNotificationDisplay.ts` + trigger aliases |
| Settings detailed section | i18n keys in `settings.json` (ja/en/zh-Hans) + component wiring |
| Tests | Dividend unit tests + Settings literal/key scan |

No new features. No UI layout changes.

---

## 4. Notification fallback additions

### New trigger aliases (`alertsI18nHelpers.ts`)

- `削减股息`, `削減股息`, `配当減少` → `triggers.dividendDecrease`
- `增派股息` → `triggers.dividendIncrease`

### New message patterns (`bursaNotificationDisplay.ts`)

| Source (ja) | English | zh-Hans |
|---|---|---|
| `{SYMBOL} — 減配` | `{SYMBOL} — Dividend cut` | `{SYMBOL} — 削减股息` |
| `{SYMBOL}が減配しました` | `{SYMBOL} cut its dividend` | `{SYMBOL}削减了股息` |
| `{SYMBOL}が増配を発表しました` | `{SYMBOL} announced a dividend increase` | `{SYMBOL}宣布增派股息` |

### New i18n keys (`alerts.json`)

- `dividendCutMessage`, `dividendCutMessageWithReason`
- `dividendIncreaseMessage`, `dividendIncreaseMessageWithReason`
- `fallbacks.genericNotification` (hiragana/katakana safety net)

### Hiragana safety

- `containsHiraganaOrKatakana()` in `localeScript.ts` prevents raw Japanese grammar from leaking when pattern match fails.

---

## 5. Settings detailed-settings i18n

### New namespaces (`settings.json` — ja / en / zh-Hans)

- `detailedSettings.sectionTitle`, `detailedSettings.sectionHint`
- `personalUse.*` (label, tagline, disclaimer1–3)
- `platformClarification.*` (system notice, disclaimers, capability lists)
- `riskNotice.*` (title, body, self-responsibility)

### Wired components

- `SettingsScreen.tsx` — section title/hint via `t()`
- `PersonalUseBanner.tsx` — full i18n
- `PlatformClarificationCard.tsx` — full i18n (compact + full modes)
- `RiskNoticeOrangeBox.tsx` — full i18n

---

## 6. Expected display (verification targets)

### English — Alerts

- `ZETRIX — Dividend cut`
- `ZETRIX cut its dividend`

### zh-Hans — Alerts

- `ZETRIX — 削减股息`
- `ZETRIX削减了股息`

### English — Settings (Detailed settings)

- **Detailed settings**
- **Personal use** / tagline / disclaimers in English
- Risk notice box in English

### zh-Hans — Settings

- **详细设置** / **个人使用** / Chinese disclaimers

---

## 7. Unit tests

```text
npx vitest run tests/unit/i18n
→ 31/31 passed (5 files)
```

Added:

- `bursaNotificationDisplay.test.ts` — dividend title/message en + zh-Hans
- `m1VisibleJaLeakScan.test.ts` — Settings detailed-settings keys + literal scan

---

## 8. Typecheck

```text
npm run typecheck
→ Pre-existing errors only (bursaPhase24Analysis, newsApiClient, storage, test fixtures)
→ No new errors from v35 i18n changes
```

---

## 9. Build artifacts

| Item | Value |
|---|---|
| **versionCode** | 35 |
| **EAS build ID** | `dbb149f8-6811-4878-828e-a0fc3c57b1db` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/dbb149f8-6811-4878-828e-a0fc3c57b1db |
| **AAB filename** | `malaysia-stock-ai-concierge-v35-production.aab` |
| **AAB path** | `docs/review/play-it-aab-m1-en-ja-leak-v35/malaysia-stock-ai-concierge-v35-production.aab` |
| **Artifact URL** | https://expo.dev/artifacts/eas/vVaNMQu6hvCBPLWLYPUrYEH_wPSgqEo7dMXviCGLu6c.aab |
| **AAB size** | 54,651,036 bytes |

---

## 10. Git

| Item | Value |
|---|---|
| **Hotfix commit** | `8a70422` |
| **Branch** | `cursor/top3-maxdd-capital-audit` |

---

## 11. Play Console — next steps

1. Upload `malaysia-stock-ai-concierge-v35-production.aab` to Internal Testing.
2. Release name: `1.0.0 (35)`.
3. Re-test **English** and **zh-Hans** on device:
   - Alerts tab — scroll past ZETRIX; confirm dividend-cut rows are localized.
   - Settings → Detailed settings — confirm no Japanese UI chrome.
4. If clean, M1 visible JA leak pass can proceed to final audit sign-off.

---

## 12. Modified files

- `app.json` (versionCode 35)
- `src/utils/localeScript.ts`
- `src/utils/alertsI18nHelpers.ts`
- `src/utils/bursaNotificationDisplay.ts`
- `src/screens/SettingsScreen.tsx`
- `src/components/PersonalUseBanner.tsx`
- `src/components/PlatformClarificationCard.tsx`
- `src/components/RiskNoticeOrangeBox.tsx`
- `src/i18n/resources/{ja,en,zh-Hans}/settings.json`
- `src/i18n/resources/{en,zh-Hans}/alerts.json`
- `tests/unit/i18n/bursaNotificationDisplay.test.ts`
- `tests/unit/i18n/m1VisibleJaLeakScan.test.ts`
