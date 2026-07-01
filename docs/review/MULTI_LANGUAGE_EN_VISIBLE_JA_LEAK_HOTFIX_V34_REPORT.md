# MULTI_LANGUAGE_EN_VISIBLE_JA_LEAK_HOTFIX_V34_REPORT

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Scope:** M1 English visible JA leak hotfix · versionCode **34** · no M2 full translation · no UI redesign

---

## 1. Executive summary

v33 device verification showed English UI still rendering raw `titleJa` / `messageJa`, Japanese AI chat status strings, Settings nav rows, and concierge short-answer labels. v34 adds **display-layer English/zh-Hans fallbacks** for Bursa notification fields, AI chat status/mock replies, Settings Standard chrome, and hides Pro-only dev blocks in Standard mode.

| Metric | v33 | v34 |
|--------|-----|-----|
| `tests/unit/i18n` | 20/20 | **27/27** |
| versionCode | 33 | **34** |
| Raw `titleJa` in M1 alert JSX | yes | **no** (display helpers) |

---

## 2. Issues fixed (user-confirmed on v33)

| Area | Fix |
|------|-----|
| **Alerts** | `formatNotificationTitleDisplay`, `formatNotificationMessageDisplay`, `formatTodayActionDisplay`, `formatTodayReasonDisplay`, material quality label fallback |
| **AI Chat digest** | Notification digest + home card wired to display helpers |
| **AI Chat status** | `requestStatusLabelForLocale` / `statusLabelForLocale` via `aiAssistantChatState` |
| **Concierge short answer** | i18n labels + English fallbacks when content contains Japanese script |
| **mockAiChat** | `replyForLocale()` + `concierge:mockReply.*` keys |
| **Trade queue** | `concierge:tradeQueue.viewExplanation` / `closeDetails` |
| **Settings Standard** | Nav rows i18n; `formatConfiguredStatusLineI18n`; provider `helpText`; advanced disclosure i18n; hide dev rows + operational test block unless Pro |

---

## 3. New utilities

| File | Purpose |
|------|---------|
| `src/utils/localeScript.ts` | `containsJapaneseScript`, `isJaAppLocale` |
| `src/utils/bursaNotificationDisplay.ts` | Alert title/message/today-action/reason fallbacks |
| `src/utils/apiConnectionI18n.ts` | API connection status labels |
| `src/utils/aiRequestStatusI18n.ts` | AI request status labels |
| `src/utils/apiProviderHelpText.ts` | Provider help text from settings i18n |

---

## 4. i18n keys added

| Namespace | Keys |
|-----------|------|
| `alerts` | `todayActionPrefix`, `netProfitDecrease`, `recommendedBuyShares`, `undervaluedRank`, `dataUnavailable`, `materialQualityLabels.*`, `fallbacks.*` |
| `concierge` | `shortAnswer.*`, `mockReply.*`, `tradeQueue.*`, `homeCard*` |
| `settings` | `nav.*` (wizard, diagnostics, dev rows), `apiConnectionStatus.*`, `requestStatus.*`, `apiProviders.*`, `operationalTest.*`, `advancedDisclosure.*`, `configuredWithMask` |

Parallel keys in `zh-Hans`.

---

## 5. Unit test results

```text
npx vitest run tests/unit/i18n
```

| Result | Detail |
|--------|--------|
| **PASS** | **27/27** (5 files) |

New/extended:

- `tests/unit/i18n/bursaNotificationDisplay.test.ts` — pattern fallbacks
- `tests/unit/i18n/m1VisibleJaLeakScan.test.ts` — raw `titleJa` wiring scan, mockAiChat locale guard

---

## 6. Typecheck results

```text
npm run typecheck
```

| Result | Detail |
|--------|--------|
| **Pre-existing errors only** | No new errors from v34 i18n changes |

---

## 7. versionCode 34

| Item | Value |
|------|-------|
| `app.json` | **34** |
| EAS `appBuildVersion` | **34** |

---

## 8. EAS build ID

`4ec48aec-8711-4482-b4b1-44be213ff318`

---

## 9. EAS build URL

https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/4ec48aec-8711-4482-b4b1-44be213ff318

---

## 10. AAB filename

`malaysia-stock-ai-concierge-v34-production.aab`

---

## 11. AAB path

```
docs/review/play-it-aab-m1-en-ja-leak-v34/malaysia-stock-ai-concierge-v34-production.aab
```

**Artifact URL:** https://expo.dev/artifacts/eas/QYIxJzKRFYedr81PtptiODNbkKZrOtkRFgSKa9EvbE4.aab

**Size:** 54,648,342 bytes

Manifest: `docs/review/play-it-aab-m1-en-ja-leak-v34/manifest.json`

---

## 12. Git commit

| Item | Value |
|------|-------|
| Hash | `4d05c7ad85c1bf79637b271c1329d1eab1b302f3` |
| Message | English visible JA leak hotfix for M1 i18n completion |

---

## 13. Play Console next steps

1. Internal testing → **Create new release**
2. Upload v34 AAB (Release name: `1.0.0 (34)`)
3. Release notes example:

```
M1 i18n hotfix: English/zh-Hans no longer show raw Japanese alert text, AI status strings, or Settings nav labels. Standard mode hides dev operational test blocks.
```

4. Set Settings → Language → **English**
5. Verify Standard mode:
   - AI Alerts: titles/messages/today action in English
   - AI Chat: API status + mock replies + trade queue toggle
   - Settings: nav rows, API key “Configured”, advanced disclosure
   - No 実運用テスト / 実機監査 block unless Pro

---

## 14. Out of scope (unchanged)

- M2 full translation of generated Bursa analysis prose
- UI design changes
- Pro audit panel content (hidden in Standard only)
