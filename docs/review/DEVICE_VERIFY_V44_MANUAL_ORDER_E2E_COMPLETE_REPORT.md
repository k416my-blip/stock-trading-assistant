# Device Verify v44 — Manual Order Create→List E2E Complete Report

**Date:** 2026-07-07  
**Device:** FYRWXSNNAIOR9DCM (versionCode 44)  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Overall:** **PASS** (4/4 flows)  
**AAB:** 未作成（Build Credit 節約）

---

## Summary

| Flow | Result | Run tag | Pending before → after | Alert |
|------|--------|---------|------------------------|-------|
| **concierge_full** | **PASS** | `rerun5-flow-concierge_full` | **0 → 6** | `view-list` |
| **manual_full** | **PASS** | `rerun5-flow-manual_full-v4` | **12 → 13** | `view-list` |
| **concierge_symbol** | **PASS** | `rerun5-flow-concierge_symbol-v1` | **13 → 14** | `view-list` |
| **concierge_quantity** | **PASS** | `rerun5-flow-concierge_quantity-v2` | **13 → 14** | `view-list` |

All flows: Open PASS → form-state probe PASS → Create tap → success alert or probe → pending increased (or inline post-create probe).

---

## Practice mode policy

Manual order list creation is **allowed in practice mode**. Create is blocked only by `readOnlyBlockedMessage` (kill switch read-only), **not** by practice/live analysis mode. All four E2E runs executed with practice-compatible create path; no practice-block on create.

---

## Root causes fixed

### 1. RN controlled TextInput state
`adb input text` does not fire React Native `onChangeText`. Symbol/deposit stayed empty in React state while UI looked filled.

**Fix:** `manual-order-e2e-apply-seed` probe + `formatManualOrderFormProbe` verification before Create; keyevent typing fallback; optional AsyncStorage seed (when sqlite3 available).

### 2. Create tap coordinate issue
`findTestId(manual-order-create-*)` often resolved to `cy>2400` (below fold). Tap missed the button → `no-alert`, pending unchanged.

**Fix:** scroll-up before tap; prefer visible label `手動注文リストを作成` (CREATE) over off-screen testID coords.

### 3. Pending probe misread
After `view-list` alert, navigation churn caused wrong pending counts (e.g. 14→13).

**Fix:** `readPendingAfterCreate` inline read on list screen before home navigation; post-create UI probe source `ui-inline-post-create`.

### 4. Infrastructure (all flows)
- `waitForCreateOutcome` — no silent `no-alert`
- `dismissPostCreateAlert` false-positive fix
- Metro check via `curl.exe` (PowerShell hang fix)
- OOM-safe single-flow runner `run-v44-e2e-flow.mjs`

---

## Commit hashes

| Commit | Description |
|--------|-------------|
| `e1ebd4f` / `23fa8f9` | Device Verify v44 E2E rerun5 — alert probe, pending fallbacks |
| `28fa59e` | Alert detection and list nav retry |
| `5d8bb76` | OOM stability — lite runner, memory gate, artifact prune |
| `7ba2d3d` | **manual_full** — form-state probe, create tap fix |
| `fafdf2b` | **concierge_symbol** — apply-seed + form-state E2E |
| `d2902a8` | **concierge_quantity** — apply-seed + pending inline probe |

**Latest HEAD (reports):** `2958d39`

---

## Push

All commits pushed successfully to `origin/cursor/top3-maxdd-capital-audit`.

---

## AAB

**未作成** — Build Credit 節約のため AAB/APK ビルドは実施していません。

