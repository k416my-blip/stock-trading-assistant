# RM5000 Recommendation Device Smoke Report

**Date:** 2026-07-07  
**Device:** Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`)  
**Overall:** **PASS** (audit log on host: **PARTIAL**)

---

## Summary

Single-flow device smoke for **concierge_full** with **RM5,000** · Bursa · beginner allocation.
Create→List succeeded; pending increased by 8; disclaimer maintained.

**AAB:** **Not created** (Build Credit saving policy)

---

## Pre-checks

| Check | Result |
|-------|--------|
| adb devices | `FYRWXSNNAIOR9DCM device` |
| versionCode | 44 |
| Metro :8081 | OK |
| Memory gate | PASS (ok=true) |
| pending before | 19 |

---

## Flow executed

- **Flow:** `concierge_full` (コンシェルジュに全て任せる)
- **Run tag:** `rm5000-smoke-rerun3`
- **Script:** `run-rm5000-device-smoke.mjs`

---

## RM5,000 reflection

| Item | Result |
|------|--------|
| Form probe amount | **5000** (via `manual-order-e2e-apply-seed`) |
| validation | ok |
| Market | bursa |

Note: `adb input keyevent` deposit entry produced `50002` (typo). Fixed by dev apply-seed probe setting React state directly.

---

## Proposal / list display

| Item | Result |
|------|--------|
| Disclaimer (no order send) | **Visible** |
| Detailed reason/risk per symbol | **PARTIAL** (concierge_full form; reasons on allocation plan screen) |
| Symbols visible on list (first screen) | 4707 (5株), 1295 (142株) |
| Items added (pending delta) | **+8** (19 → 27) |

Expected RM5,000 allocation (unit baseline): 4707, 1295, 3336, 0820EA, 1023, 5398, 5183, 7103.

---

## Manual order list conversion

| Item | Result |
|------|--------|
| Create handler | Called |
| alert / probe | **view-list** |
| pending after | **27** |
| pending delta | **+8** |
| side / market | buy / bursa (visible items) |

---

## API failure (scope)

Not exercised on device this run. Price-missing safety covered by unit tests (`candidatesToManualBuyItemsSafe`).

---

## Audit log

| Field | Device |
|-------|--------|
| Host sqlite3 read | Unavailable (seed/read skipped) |
| logcat `[QUALITY-AUDIT]` | Not captured (bundle reload timing) |
| In-app persist hook | Added in `manualOrderFlow` concierge_full |

**PARTIAL:** audit fields verified in unit tests; device host read blocked without sqlite3.

---

## Evidence (minimal)

- `docs/review/rm5000-device-smoke/result.json`
- `docs/review/rm5000-device-smoke/list-after-create.png`

No bulk PNG/XML/log dumps.

---

## Git

Commit hash: `0452020d413cbaa711209f44996d40e5ddc67d5b`
Push: pending

AAB created: **No** — Build Credit saving

