# Device Verify v44 — E2E Final Rerun 3 Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 11 / 0 / 16
- **Device**: 23090RA98G (FYRWXSNNAIOR9DCM)
- **versionCode**: versionCode=44 minSdk=24 targetSdk=36
- **Timestamp**: 2026-07-06T07:55:09.371Z
- **Git commit**: `30abde18f3202210e3f93923653029b8784be330`
- **Push**: pending post-rerun commit

## Manual order list policy
- **Live analysis required**: No — lists are for Rakuten manual hand-entry only; practice mode may create lists.
- **Practice mode create allowed**: See Test C

## Commands
```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
. .\scripts\git-env.ps1
npm run start:clear
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
node run-v44-e2e-all.mjs --rerun3
```

## adb devices
```
List of devices attached
FYRWXSNNAIOR9DCM	device
```

## Language / onboarding / home
| Check | Status | Detail |
|-------|--------|--------|
| test-a-language-ja | FAIL | language-ja not found |
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
App mode policy: live analysis mode required

## Test D — UX modes
| Mode | Switch | 4 buttons | Flow open |
|------|--------|-----------|-----------|
| Beginner | PASS | 4/4 | PASS |
| Standard | FAIL | 4/4 | PASS |
| Pro | FAIL | 4/4 | PASS |

## Test E — Trust
| Check | Status | Detail |
|-------|--------|--------|
| test-e-trust-mode-switch | FAIL | AI信託モード |
| test-e-four-buttons | FAIL | 0/4 |
| test-e-flow-open | FAIL | concierge_full not tappable activity=com.assistant.stocktrading |

## Evidence
- Screenshots/XML: `docs/review/device-verify-v44/`
- Failure artifacts: `docs/review/device-verify-v44/rerun3-artifacts/`
- Merged JSON: `docs/review/device-verify-v44/results-e2e-rerun3-merged.json`
- Per-step logs: `e2e-rerun3-run-*.log`

## AAB
- **Created**: No — Build Credit 節約のため今回は未作成

## Git manual
```powershell
. .\scripts\git-env.ps1
git --version
git push origin cursor/top3-maxdd-capital-audit
```

## Remaining failures
- **test-a-language-ja** (FAIL): language-ja not found
- **test-d-standard-mode-switch** (FAIL): 標準
- **test-d-pro-mode-switch** (FAIL): プロ
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
- **test-e-trust-mode-switch** (FAIL): AI信託モード
- **test-e-four-buttons** (FAIL): 0/4
- **test-e-flow-open** (FAIL): concierge_full not tappable activity=com.assistant.stocktrading