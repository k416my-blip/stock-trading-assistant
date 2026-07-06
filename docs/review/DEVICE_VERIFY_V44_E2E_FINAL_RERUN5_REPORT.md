# Device Verify v44 - E2E Final Rerun 5 Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 7 / 0 / 1
- **Device**: 23090RA98G (FYRWXSNNAIOR9DCM)
- **versionCode**: versionCode=44 minSdk=24 targetSdk=36
- **Timestamp**: 2026-07-06T22:24:46.072Z
- **Git commit**: `82312aa765fa6864168f02d5d8a048a2a27c84ee`
- **Push**: not attempted

## ADB preflight
- adb kill-server / start-server: OK
- adb devices: FYRWXSNNAIOR9DCM device
- input keyevent 3: OK
- input tap 101 2541: OK

## E2E script fixes (rerun4)
- Removed `enableLiveAnalysisMode` and `test-c-live-mode` from all runners.
- Removed `settings-nav-practice-mode` lookup — no longer fails create→list in practice mode.
- Merge uses isolated `results-rerun4-{a,b,c}.json` (stale rerun3 live-mode rows excluded).
- Standard/Pro/Trust moved to `run-v44-e2e-modes.mjs`.

## Manual order list policy
- **Live analysis required**: No - lists are for Rakuten manual hand-entry only; practice mode may create lists.
- **Practice mode create allowed**: Yes (E2E confirmed)

## Commands
```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
$env:E2E_RUN_TAG='rerun5'
$env:SKIP_PM_CLEAR='1'
. .\scripts\git-env.ps1
npm run start:clear
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
node run-v44-e2e-all.mjs --rerun5
```

## adb devices
```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

## Language / onboarding / home
| Check | Status | Detail |
|-------|--------|--------|
| test-a-language-ja | PASS | 日本語 already active (picker skipped) |
| test-a-onboarding-dismiss | PASS | home reachable |
| test-b-four-buttons | PASS | 4/4 |
| test-b-home-stability | PASS | 20s home stable |

## Test C - create to list (4 flows)
| Flow | Open | E2E | Pending |
|------|------|-----|---------|
| コンシェルジュに全て任せる | N/A | N/A | N/A |
| 自分で銘柄と数量を指定する | N/A | N/A | N/A |
| 銘柄だけコンシェルジュに任せる | N/A | N/A | N/A |
| 数量だけコンシェルジュに任せる | N/A | N/A | N/A |

**Pending baseline**: baseline pending unavailable (ui+storage+appState)
**App mode policy**: practice mode allowed — manual order list is Rakuten hand-entry only (no live analysis required)

## Create error alerts (if any)
- **concierge_full**: none (alert=N/A)
- **manual_full**: none (alert=N/A)
- **concierge_symbol**: none (alert=N/A)
- **concierge_quantity**: none (alert=N/A)

## Pending probes (after create)
- **concierge_full**: N/A
- **manual_full**: N/A
- **concierge_symbol**: N/A
- **concierge_quantity**: N/A

## Practice mode save guarantee (code review)
- `ManualOrderFlowScreen`: create blocked only by `readOnlyBlockedMessage`, not practice mode
- `addManualBuyOrders` (`useAppPortfolioActions.ts`): no practice guard on list append
- `manualOrderConfirmation`: practice blocks **confirm/execute**, not list **create**

## Standard / Pro / Trust mode checks
- **Executed in this run**: No
- **Reason**: Mode switching (Standard / Pro / Beginner / Trust) is separated into `run-v44-e2e-modes.mjs` so create→list 4 flows can pass first without UX-mode navigation blocking Test C.
- **Run separately**: `node run-v44-e2e-modes.mjs`

## UTF-8 / mojibake fix
- Markdown: UTF-8 with BOM via writeUtf8File
- Node: PYTHONIOENCODING=utf-8
- PowerShell: chcp 65001 before run; avoid Tee-Object -Encoding on older PS
- Report uses ASCII hyphen instead of em-dash for console compatibility

## Evidence
- Screenshots/XML: `docs/review/device-verify-v44/`
- Failure artifacts: `docs/review/device-verify-v44/rerun5-artifacts/`
- Merged JSON: `docs/review/device-verify-v44/results-rerun5-merged.json`

## AAB
- **Created**: No - Build Credit saving; AAB not built this run

## Git manual
```powershell
. .\scripts\git-env.ps1
git --version
git push origin cursor/top3-maxdd-capital-audit
```

## Remaining failures
- **test-c-pending-baseline** (FAIL): baseline pending unavailable (ui+storage+appState)
