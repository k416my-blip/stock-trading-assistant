# Device Verify v44 - E2E Final Rerun 4 Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 1 / 0 / 1
- **Device**: 23090RA98G (FYRWXSNNAIOR9DCM)
- **versionCode**: unknown
- **Timestamp**: 2026-07-06T08:49:51.464Z
- **Git commit**: `442465b1f1dd9d5580aa2a7c0ebfa4e80e31698d`
- **Push**: SUCCESS (442465b pushed to cursor/top3-maxdd-capital-audit)

## Run infrastructure
- Test A aborted mid-run: adb `input` service unavailable (`cmd: Can't find service: input`) — USB disconnect suspected.
- B/C did not run. Re-run when device is stable: `node run-v44-e2e-all.mjs --rerun4`

## E2E script fixes (rerun4)
- Removed `enableLiveAnalysisMode` and `test-c-live-mode` from all runners.
- Removed `settings-nav-practice-mode` lookup — no longer fails create→list in practice mode.
- Merge uses isolated `results-rerun4-{a,b,c}.json` (stale rerun3 live-mode rows excluded).
- Standard/Pro/Trust moved to `run-v44-e2e-modes.mjs`.

## Manual order list policy
- **Live analysis required**: No - lists are for Rakuten manual hand-entry only; practice mode may create lists.
- **Practice mode create allowed**: See Test C results

## Commands
```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
$env:E2E_RUN_TAG='rerun4'
. .\scripts\git-env.ps1
npm run start:clear
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
node run-v44-e2e-all.mjs --rerun4
```

## adb devices
```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

## Language / onboarding / home
| Check | Status | Detail |
|-------|--------|--------|

## Test C - create to list (4 flows)
| Flow | Open | E2E | Pending |
|------|------|-----|---------|
| コンシェルジュに全て任せる | N/A | N/A | N/A |
| 自分で銘柄と数量を指定する | N/A | N/A | N/A |
| 銘柄だけコンシェルジュに任せる | N/A | N/A | N/A |
| 数量だけコンシェルジュに任せる | N/A | N/A | N/A |

**Pending baseline**: N/A
**App mode policy**: N/A

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
- Failure artifacts: `docs/review/device-verify-v44/rerun4-artifacts/`
- Merged JSON: `docs/review/device-verify-v44/results-rerun4-merged.json`

## AAB
- **Created**: No - Build Credit saving; AAB not built this run

## Git manual
```powershell
. .\scripts\git-env.ps1
git --version
git push origin cursor/top3-maxdd-capital-audit
```

## Remaining failures
- **test-a-fatal** (FAIL): Command failed: adb -s FYRWXSNNAIOR9DCM shell input tap 101 2541
cmd: Can't find service: input

