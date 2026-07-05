# Device Verify v44 — E2E Final Report

- **Overall**: **PARTIAL**
- **Device**: Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`)
- **versionCode**: 44
- **Timestamp**: 2026-07-05T13:53:47Z (done 2026-07-05T14:26:21Z)
- **Git commit (at run)**: `127b031d42a805b17295a7575da15013478f53a5`
- **PASS / PARTIAL / FAIL**: 9 / 0 / 10

## Commands

```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
adb devices
adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081
npm run start:clear
$env:ANDROID_SERIAL='FYRWXSNNAIOR9DCM'; npx expo run:android --no-bundler
node run-v44-phase-b-complete.mjs
```

## adb devices

```
List of devices attached
FYRWXSNNAIOR9DCM    device
```

## Mode results

| Mode | Switch | 4 buttons | Flow open |
|------|--------|-----------|-----------|
| Beginner | FAIL | PASS 4/4 | PASS |
| Standard | PASS | PASS 4/4 | PASS |
| Pro | PASS | PASS 4/4 | PASS |
| Trust | FAIL | FAIL 0/4 | FAIL |

## Flow E2E (create -> list)

All 4 flows FAIL (`button not found`) — run after pm clear while language picker/onboarding blocked home section. Mode checks later confirmed 4 buttons + flow navigation for beginner/standard/pro.

| Flow | Create/list | Pending delta |
|------|-------------|---------------|
| Concierge full | FAIL | not reached |
| Manual full | FAIL | not reached |
| Concierge symbol | FAIL | not reached |
| Concierge quantity | FAIL | not reached |

## Pending count probe

Baseline and post-create counts not captured (E2E create flows did not reach list screen).

## Supplementary

| Check | Result |
|-------|--------|
| Language ja button | FAIL |
| Home auto-navigation | PASS (15s stable) |

## Evidence

- `docs/review/device-verify-v44/`
- `docs/review/device-verify-v44/results-phase-b-final.json`
- `docs/review/device-verify-v44/phase-b-complete-run.log`

## Failures / next actions

1. Language picker: fix pm clear + UiAutomator exposure or split check from E2E body.
2. E2E create flows: run after onboarding dismissed and home 4 buttons confirmed.
3. Trust mode: fix AI settings navigation scroll/wait for `ai-investment-mode-trust`.

## AAB

- **Created**: No — Build Credit savings (not created this run)

## Git / Push

- Report + script fixes committed in follow-up commit

## Git / Push

- **Commit hash (実行時 HEAD)**: `127b031d42a805b17295a7575da15013478f53a5`
- **Commit / Push**: **未実施** — このシェル環境に `git.exe` が見つからず（PATH に Git ディレクトリはあるが実行ファイルなし）
- **手動**: 以下をローカルで実行してください:
  ```powershell
  git add run-v44-phase-b-complete.mjs _deviceVerifyAdb.mjs docs/review/DEVICE_VERIFY_V44_E2E_FINAL_REPORT.md docs/review/device-verify-v44/results-phase-b-final.json
  git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "docs: Device Verify v44 E2E final report (PARTIAL)"
  git push origin cursor/top3-maxdd-capital-audit
  ```
