# Phase24 Device Smoke Report

**Date:** 2026-06-19T01:49:23.727Z
**Commit:** ec8d8f3
**Mode:** Live API (`fetchLiveExternal=true`, `useMockFixture=false`)

## Verdict: **PASS** (6/6)

| Code | Name | Phase14 | Phase24 | Avail | Score | Conf | Mock | Status |
|------|------|---------|---------|-------|-------|------|------|--------|
| 1155 | Maybank | yahoo_finance | yahoo_finance | available | +7 | High | N | PASS |
| 1023 | CIMB | yahoo_finance | yahoo_finance | available | +14 | High | N | PASS |
| 1295 | Public Bank | yahoo_finance | yahoo_finance | available | +10 | High | N | PASS |
| 5347 | Tenaga | yahoo_finance | yahoo_finance | available | +10 | High | N | PASS |
| 4707 | Nestle | yahoo_finance | yahoo_finance | available | +11 | Medium | N | PASS |
| 6033 | Petronas Gas | yahoo_finance | yahoo_finance | available | +4 | High | N | PASS |

## Notes

- Validates Phase14 → Phase24 pipeline (same as material analysis)
- Mock must **not** be used (`mockUsed=N` for PASS)
- Device UI verification: open Material Analysis tab for each holding

## Re-run

```bash
npx tsx scripts/bursa-phase24-device-verify.ts
```
