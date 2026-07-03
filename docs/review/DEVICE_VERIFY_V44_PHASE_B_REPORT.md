# Device Verify v44 窶・Phase B Report

**Branch:** `cursor/top3-maxdd-capital-audit`  
**Device:** FYRWXSNNAIOR9DCM (23090RA98G)  
**versionCode:** 44  
**Date:** 2026-07-03 (UTC)  
**AAB:** NO AAB built (Build Credit savings)

## Executive summary

| Area | Result |
|------|--------|
| Phase B overall | **PARTIAL** |
| Home manual-order section (4 buttons, JA) | **PARTIAL** (scroll corpus 1/4; all 4 tappable in capture run) |
| Flow navigation (4 modes) | **PASS** (capture run) |
| Manual order list creation E2E | **NOT RUN** (create-list tap not automated in capture run) |
| UX modes (beginner/standard/pro/trust) | **PARTIAL** (beginner switch PASS in run 4; full matrix not completed) |
| Automation scripts | **UPDATED** (`run-v44-phase-b.mjs`, `finish-flows.mjs`, `run-v44-phase-b-capture.mjs`) |

## Targets vs results

| # | Target | Status | Notes |
|---|--------|--------|-------|
| 1 | Home shows all 4 JA manual-order buttons | PARTIAL | `phase-b-capture-scroll-corpus.txt` sees 1/4 labels; UIAutomator misses stacked labels until tap-scroll. Manual probe after onboarding: section + 4/4 present. |
| 2 | Each button opens correct flow | PASS | All four flows opened expected JA titles (see screenshots). |
| 3 | Each flow creates manual order list | FAIL / not executed | Capture script stops at flow screen; create-list + list verification pending. |
| 4 | Same buttons in beginner/standard/pro/trust | PARTIAL | Beginner display mode switch PASS (run 4); trust/pro/standard matrix blocked when onboarding overlay present. |
| 5 | Script hardening | PASS | See Script changes below. |
| 6 | Device re-run | PASS | Capture run on serial FYRWXSNNAIOR9DCM, versionCode 44. |
| 7 | Report | PASS | This document. |

## Evidence (Phase B)

| Artifact | Path |
|----------|------|
| Results JSON | `docs/review/device-verify-v44/results-phase-b.json` |
| Scroll corpus | `docs/review/device-verify-v44/phase-b-capture-scroll-corpus.txt` |
| Corpus screenshot | `docs/review/device-verify-v44/phase-b-four-buttons-corpus.png` |
| Button screenshots | `docs/review/device-verify-v44/phase-b-btn-*-home.png` |
| Flow screenshots | `docs/review/device-verify-v44/phase-b-flow-*-screen.png` |
| Full runner logs | `docs/review/device-verify-v44/phase-b-run-4.log`, `phase-b-capture.log` |
| Phase A baseline | `docs/review/device-verify-v44/results-summary.json` |

### Flow destinations (capture run)

- **flow-concierge_full**: PASS 窶・opened 繧ｳ繝ｳ繧ｷ繧ｧ繝ｫ繧ｸ繝･縺ｫ蜈ｨ縺ｦ莉ｻ縺帙ｋ
- **flow-manual_full**: PASS 窶・opened 驫俶氛縺ｨ謨ｰ驥上ｒ謖・ｮ・
- **flow-concierge_symbol**: PASS 窶・opened 驫俶氛縺縺代さ繝ｳ繧ｷ繧ｧ繝ｫ繧ｸ繝･縺ｫ莉ｻ縺帙ｋ
- **flow-concierge_quantity**: PASS 窶・opened 謨ｰ驥上□縺代さ繝ｳ繧ｷ繧ｧ繝ｫ繧ｸ繝･縺ｫ莉ｻ縺帙ｋ

## UX mode notes

- **Settings navigation:** use bottom tab coordinates (`Home` 101,2486 / `Settings` 1118,2486), scroll settings to top before picking display mode rows.
- **Display mode rows:** exact `蛻晏ｿ・・ / `讓呎ｺ冒 / `繝励Ο` (JA) or `Beginner` / `Standard` / `Pro` (EN fallback in `run-v44-phase-b.mjs`).
- **Trust mode:** `AI菫｡險励Δ繝ｼ繝荏 via Settings 竊・`AI謌ｦ逡･繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝郁ｨｭ螳啻 (constants in `src/constants/investmentDisplay.ts`).
- **Onboarding blocker:** after language change, beginner onboarding (`home.onboarding.skip`) must be dismissed before home manual-order section is reachable (root cause of run 4 `0/4` corpus).

## Script changes

### `docs/review/device-verify-v44/run-v44-phase-b.mjs`
- `ADB_SERIAL` support, `adb exec-out` screenshots, dump retry (5ﾃ・ 1.5s).
- Splash guard: host `dumpsys window` (no device `grep`), skip dump while splash text unstable.
- Home scroll corpus: 28+ swipes (1900竊・00), merged `*-scroll-corpus.txt`.
- Post-tap wait: `POST_TAP_MS` default 15s (10窶・0 configurable).
- Settings: bottom-tab open + `scrollSettingsToTop()` before mode/language rows.
- JA language via `settings-language-ja` accessibility row.
- `completeOnboarding()` + `scrollHomeToTop()` before corpus/flows.
- Flow completion helpers (`tapCreateOnFlowScreen`) for list creation (full runner).

### `docs/review/device-verify-v44/finish-flows.mjs`
- Same dump retry, scroll corpus, post-tap wait, splash guard (host dumpsys), `ADB_SERIAL`.

### `docs/review/device-verify-v44/run-v44-phase-b-capture.mjs`
- Focused Phase B capture used for final PASS flow navigation evidence after onboarding dismissed.

## Git / push / AAB

- **AAB:** not built (per instruction).
- **Commit:** device verification scripts + this report only (`deb45d4`).

## Root causes / follow-ups

1. UIAutomator scroll corpus under-counts stacked RN buttons (PARTIAL visibility); per-button tap-scroll succeeds.
2. Onboarding overlay after JA language must be dismissed before home section checks.
3. Automate create-list + `ManualOrderList` assertion in `run-v44-phase-b.mjs` (alert `繝ｪ繧ｹ繝医ｒ隕九ｋ`).
4. Re-run full 4-mode matrix once onboarding + settings helpers are stable.


