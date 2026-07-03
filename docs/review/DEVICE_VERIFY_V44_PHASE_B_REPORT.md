# Device Verify v44 — Phase B Report

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

- **flow-concierge_full**: PASS — opened コンシェルジュに全て任せる
- **flow-manual_full**: PASS — opened 銘柄と数量を指定
- **flow-concierge_symbol**: PASS — opened 銘柄だけコンシェルジュに任せる
- **flow-concierge_quantity**: PASS — opened 数量だけコンシェルジュに任せる

## UX mode notes

- **Settings navigation:** use bottom tab coordinates (`Home` 101,2486 / `Settings` 1118,2486), scroll settings to top before picking display mode rows.
- **Display mode rows:** exact `初心者` / `標準` / `プロ` (JA) or `Beginner` / `Standard` / `Pro` (EN fallback in `run-v44-phase-b.mjs`).
- **Trust mode:** `AI信託モード` via Settings → `AI戦略アシスタント設定` (constants in `src/constants/investmentDisplay.ts`).
- **Onboarding blocker:** after language change, beginner onboarding (`home.onboarding.skip`) must be dismissed before home manual-order section is reachable (root cause of run 4 `0/4` corpus).

## Script changes

### `docs/review/device-verify-v44/run-v44-phase-b.mjs`
- `ADB_SERIAL` support, `adb exec-out` screenshots, dump retry (5×, 1.5s).
- Splash guard: host `dumpsys window` (no device `grep`), skip dump while splash text unstable.
- Home scroll corpus: 28+ swipes (1900→600), merged `*-scroll-corpus.txt`.
- Post-tap wait: `POST_TAP_MS` default 15s (10–30 configurable).
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
- **Commit:** device verification scripts + this report only (see commit hash below after push).

## Root causes / follow-ups

1. UIAutomator scroll corpus under-counts stacked RN buttons (PARTIAL visibility); per-button tap-scroll succeeds.
2. Onboarding overlay after JA language must be dismissed before home section checks.
3. Automate create-list + `ManualOrderList` assertion in `run-v44-phase-b.mjs` (alert `リストを見る`).
4. Re-run full 4-mode matrix once onboarding + settings helpers are stable.

