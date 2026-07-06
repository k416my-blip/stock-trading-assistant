# Device Verify v44 — E2E Final Rerun Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 1 / 0 / 22
- **Device**: 23090RA98G (FYRWXSNNAIOR9DCM)
- **versionCode**: versionCode=44 minSdk=24 targetSdk=36
- **Timestamp**: 2026-07-06T02:05:06.456Z
- **Git commit (run start)**: `6cdd0d785cca23f0a5448a1548b54f748415553e`
- **Git executable**: C:\Users\k416m\AppData\Local\MinGit\cmd\git.exe
- **Push**: see post-run commit

## Commands
```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
. .\scripts\git-env.ps1
adb devices
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
npm run start:clear
$env:ANDROID_SERIAL='FYRWXSNNAIOR9DCM'; npx expo run:android --no-bundler
node run-v44-e2e-rerun.mjs
```

## adb devices
```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

## Test A — cold start / language / onboarding
| Check | Status | Detail |
|-------|--------|--------|
| test-a-language-ja | FAIL | language-ja not found |
| test-a-onboarding-dismiss | FAIL | home not ready |

## Test B — home 4 buttons
| Check | Status | Detail |
|-------|--------|--------|
| test-b-four-buttons | FAIL | 0/4 buttons |

## Test C — flow E2E create → list
| Flow | Open | Create/list | Pending |
|------|------|-------------|---------|
| コンシェルジュに全て任せる | — | FAIL | skipped: home not ready |
| 自分で銘柄と数量を指定する | — | FAIL | skipped: home not ready |
| 銘柄だけコンシェルジュに任せる | — | FAIL | skipped: home not ready |
| 数量だけコンシェルジュに任せる | — | FAIL | skipped: home not ready |

## Test D — UX modes
| Mode | Switch | 4 buttons | Flow open |
|------|--------|-----------|-----------|
| Beginner | FAIL | 0/4 buttons | FAIL |
| Standard | FAIL | 0/4 buttons | FAIL |
| Pro | FAIL | 0/4 buttons | FAIL |

## Test E — Trust mode
| Check | Status | Detail |
|-------|--------|--------|
| test-e-trust-mode-switch | FAIL | AI信託モード |
| test-e-four-buttons | FAIL | 0/4 buttons |
| test-e-flow-open | FAIL | concierge_full not tappable |

## Home stability
- **FAIL**: left home tab

## Evidence
- `docs/review/device-verify-v44/` (screenshots, XML, log)
- `docs/review/device-verify-v44/results-e2e-rerun.json`
- `docs/review/device-verify-v44/e2e-rerun-run.log`

## AAB
- **Created**: No — Build Credit 節約のため今回は未作成

## Manual git commit / push
```powershell
. .\scripts\git-env.ps1
git add run-v44-e2e-rerun.mjs _deviceVerifyAdb.mjs src/constants/deviceVerifyTestIds.ts src/components/LanguagePickerModal.tsx scripts/git-env.ps1 docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN_REPORT.md
git commit -m "fix: Device Verify v44 E2E rerun — split tests A–E, language/trust probes"
git push origin cursor/top3-maxdd-capital-audit
```

## Remaining failures
- **test-a-language-ja** (FAIL): language-ja not found
- **test-a-onboarding-dismiss** (FAIL): home not ready
- **test-b-four-buttons** (FAIL): 0/4 buttons
- **test-home-stability** (FAIL): left home tab
- **test-c-live-mode** (FAIL): could not enable live analysis
- **test-c-prerequisite** (FAIL): home 4 buttons not ready before E2E
- **test-c-e2e-concierge_full** (FAIL): skipped: home not ready
- **test-c-e2e-manual_full** (FAIL): skipped: home not ready
- **test-c-e2e-concierge_symbol** (FAIL): skipped: home not ready
- **test-c-e2e-concierge_quantity** (FAIL): skipped: home not ready
- **test-d-beginner-mode-switch** (FAIL): 初心者
- **test-d-beginner-four-buttons** (FAIL): 0/4 buttons
- **test-d-beginner-flow-open** (FAIL): concierge_full not tappable
- **test-d-standard-mode-switch** (FAIL): 標準
- **test-d-standard-four-buttons** (FAIL): 0/4 buttons
- **test-d-standard-flow-open** (FAIL): concierge_full not tappable
- **test-d-pro-mode-switch** (FAIL): プロ
- **test-d-pro-four-buttons** (FAIL): 0/4 buttons
- **test-d-pro-flow-open** (FAIL): concierge_full not tappable
- **test-e-trust-mode-switch** (FAIL): AI信託モード
- **test-e-four-buttons** (FAIL): 0/4 buttons
- **test-e-flow-open** (FAIL): concierge_full not tappable