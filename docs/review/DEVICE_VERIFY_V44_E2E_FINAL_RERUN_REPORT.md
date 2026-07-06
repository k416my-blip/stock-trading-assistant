# Device Verify v44 — E2E Final Rerun Report

- **Overall**: **PARTIAL**
- **PASS / PARTIAL / FAIL**: 8 / 0 / 19
- **Authoritative run**: `docs/review/device-verify-v44/e2e-rerun-run-4.log`
- **Device**: Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`)
- **versionCode**: 44
- **Git commit**: `f81440f67ca4dfa563fb9cb6848ba178ccca9a79`
- **Push**: Success (`origin/cursor/top3-maxdd-capital-audit`)

## Commands

```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
. .\scripts\git-env.ps1
npm run start:clear
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
node run-v44-e2e-rerun.mjs
```

## adb devices

```
List of devices attached
FYRWXSNNAIOR9DCM    device
```

## Test A — cold start / language / onboarding

| Check | Result | Detail |
|-------|--------|--------|
| Metro | PASS | 8081/status ok |
| Language ja | PASS | language-ja tap |
| Onboarding | PASS | home reachable |

## Test B — home 4 buttons

| Result | Detail |
|--------|--------|
| PASS | 4/4 buttons |

## Home auto-navigation

| Result | Detail |
|--------|--------|
| PASS | 20s stable |

## Test C — create → list

| Flow | Open | E2E | Pending |
|------|------|-----|---------|
| concierge_full | PASS | FAIL | 0 → ? |
| manual_full | FAIL | FAIL | — |
| concierge_symbol | FAIL | FAIL | — |
| concierge_quantity | FAIL | FAIL | — |

Baseline pending: **0**. Practice-mode block + navigation fixes added for next run.

## Test D — UX modes (run 4)

| Mode | Switch | 4 btn | Flow |
|------|--------|-------|------|
| beginner | FAIL | FAIL | FAIL |
| standard | FAIL | FAIL | FAIL |
| pro | FAIL | FAIL | FAIL |

## Test E — Trust (run 4)

| Check | Result |
|-------|--------|
| Switch / 4 btn / flow | FAIL |

## Evidence

- `docs/review/device-verify-v44/e2e-rerun-run-4.log`
- `docs/review/device-verify-v44/results-e2e-rerun.json`

## Git manual (Cursor shell)

```powershell
. .\scripts\git-env.ps1
git --version
git add ...
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "message"
git push origin cursor/top3-maxdd-capital-audit
```

MinGit path: `%LOCALAPPDATA%\MinGit\cmd\git.exe`

## AAB

- **Created**: No — Build Credit 節約のため今回は未作成
