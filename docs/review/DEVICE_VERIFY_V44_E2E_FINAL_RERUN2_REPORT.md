# Device Verify v44 — E2E Final Rerun 2 Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 14 / 0 / 13
- **Device**: 23090RA98G (FYRWXSNNAIOR9DCM)
- **versionCode**: versionCode=44 minSdk=24 targetSdk=36
- **Timestamp**: 2026-07-06T07:50:21.006Z
- **Git commit**: `86a34c6a31c0830dad7cc302798b2e8bc3fc9453`
- **Push**: pending post-rerun commit

## Commands
```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
. .\scripts\git-env.ps1
npm run start:clear
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
node run-v44-e2e-all.mjs
```

## adb devices
```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

## Language / onboarding / home
| Check | Status | Detail |
|-------|--------|--------|
| test-a-language-ja | PASS | 日本語 selected |
| test-a-onboarding-dismiss | PASS | home reachable |
| test-b-four-buttons | PASS | 4/4 |
| test-b-home-stability | PASS | 20s home stable |

## Test C — create → list
| Flow | Open | E2E | Pending |
|------|------|-----|---------|
| コンシェルジュに全て任せる | FAIL | FAIL | skipped: practice mode |
| 自分で銘柄と数量を指定する | FAIL | FAIL | skipped: practice mode |
| 銘柄だけコンシェルジュに任せる | FAIL | FAIL | skipped: practice mode |
| 数量だけコンシェルジュに任せる | FAIL | FAIL | skipped: practice mode |

Baseline: —
Live mode: FAIL settings-nav-practice-mode not found

## Test D — UX modes
| Mode | Switch | 4 buttons | Flow open |
|------|--------|-----------|-----------|
| Beginner | FAIL | 4/4 | PASS |
| Standard | PASS | 4/4 | PASS |
| Pro | PASS | 4/4 | FAIL |

## Test E — Trust
| Check | Status | Detail |
|-------|--------|--------|
| test-e-trust-mode-switch | PASS | AI信託モード |
| test-e-four-buttons | FAIL | 0/4 |
| test-e-flow-open | PASS | コンシェルジュに全て任せる |

## Evidence
- Screenshots/XML: `docs/review/device-verify-v44/`
- Failure artifacts: `docs/review/device-verify-v44/rerun2-artifacts/`
- Merged JSON: `docs/review/device-verify-v44/results-e2e-rerun2-merged.json`
- Per-step logs: `e2e-rerun2-run-*.log`

## AAB
- **Created**: No — Build Credit 節約のため今回は未作成

## Git manual
```powershell
. .\scripts\git-env.ps1
git --version
git push origin cursor/top3-maxdd-capital-audit
```

## Remaining failures
- **test-d-beginner-mode-switch** (FAIL): 初心者
- **test-d-pro-flow-open** (FAIL): コンシェルジュに全て任せる
- **test-c-live-mode** (FAIL): settings-nav-practice-mode not found
- **test-c-prerequisite** (FAIL): live analysis mode required
- **test-c-flow-concierge_full-open** (FAIL): skipped: practice mode
- **test-c-e2e-concierge_full** (FAIL): skipped: practice mode
- **test-c-flow-manual_full-open** (FAIL): skipped: practice mode
- **test-c-e2e-manual_full** (FAIL): skipped: practice mode
- **test-c-flow-concierge_symbol-open** (FAIL): skipped: practice mode
- **test-c-e2e-concierge_symbol** (FAIL): skipped: practice mode
- **test-c-flow-concierge_quantity-open** (FAIL): skipped: practice mode
- **test-c-e2e-concierge_quantity** (FAIL): skipped: practice mode
- **test-e-four-buttons** (FAIL): 0/4