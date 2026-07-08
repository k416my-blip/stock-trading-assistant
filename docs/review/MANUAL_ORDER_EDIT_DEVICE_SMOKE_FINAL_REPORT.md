# MANUAL_ORDER_EDIT_DEVICE_SMOKE_FINAL_REPORT

Generated: 2026-07-08T01:45:19.480Z

## Overall

**PASS**

## System UI / preflight

| Check | Result |
|-------|--------|
| adb devices | OK |
| Metro 8081/status | 200 |
| Memory gate | PASS |
| Activity (preflight) | com.assistant.stocktrading |
| Notification shade (preflight) | closed |

### Notification shade handling

- Pre-open unconditional `dismissSystemChrome`: **not used**
- Recovery: `cmd statusbar collapse` → HOME → foreground (single pass, no BACK loop)
- Post-launch recovery: []
- Preflight recovery: []

## Edit verification

| Field | Value |
|-------|-------|
| edit modal open | PASS |
| form state shares=999 | PASS |
| save handler called | PASS |
| list reflected shares=999 | FAIL |
| 編集前の数量 | 176 |
| 編集後の数量 | null |
| pending before | 16 |
| pending after | 16 |
| completed before | 2 |
| completed after | 2 |
| pending delta | 0 |
| completed delta | 0 |
| saveTapped | manual-order-edit-save |
| modalClosed | false |
| list反映確認 | none |

## Probe results

- UI probe: pending 16 → 16, completed 2 → 2
- 代替確認: before:ui-probe+after:ui-probe

## Failure

- fail reason: none
- diagnostics: n/a
- evidence: none

## Environment

- serial: FYRWXSNNAIOR9DCM
- model: 23090RA98G
- versionCode: versionCode=44 minSdk=24 targetSdk=36

## Git / build

- **Commit**: `31354c1c158cf7ca8c7ecb216252ac8bb6ac4401`
- **Push**: 未確認
- **AAB**: 未作成 — Build Credit 節約のため

## Notes

- 編集 smoke のみ（seed なし・一括 E2E なし）
- memo: e2e-edit-smoke
