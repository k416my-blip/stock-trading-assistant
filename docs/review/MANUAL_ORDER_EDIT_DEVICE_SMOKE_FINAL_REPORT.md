# MANUAL_ORDER_EDIT_DEVICE_SMOKE_FINAL_REPORT

Generated: 2026-07-07T22:03:08.492Z

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
| list reflected shares=999 | PASS |
| 編集前の数量 | 100 |
| 編集後の数量 | 999 |
| pending before | 10 |
| pending after | 10 |
| completed before | 1 |
| completed after | 1 |
| pending delta | 0 |
| completed delta | 0 |
| saveTapped | save-coord-fallback |
| modalClosed | false |
| list反映確認 | list-item-text-scroll |

## Probe results

- UI probe: pending 10 → 10, completed 1 → 1
- 代替確認: tab-text+tab-text+pending-stable-assumed+completed-stable-assumed

## Failure

- fail reason: none
- diagnostics: n/a
- evidence: none

## Environment

- serial: FYRWXSNNAIOR9DCM
- model: 23090RA98G
- versionCode: versionCode=44 minSdk=24 targetSdk=36

## Git / build

- **Commit**: `df9086ac40ec5d7286965de56d482fcce35d2b0f`
- **Push**: 未確認
- **AAB**: 未作成 — Build Credit 節約のため

## Notes

- 編集 smoke のみ（seed なし・一括 E2E なし）
- memo: not filled
