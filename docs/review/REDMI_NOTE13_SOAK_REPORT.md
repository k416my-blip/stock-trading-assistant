# Redmi Note 13 Pro — 8h/24h Soak Report

**Harness version:** 1.0.0  
**Status:** DEVICE RUN REQUIRED — this report template is filled after on-device soak  
**Target:** Redmi Note 13 Pro / MIUI / HyperOS  
**Minimum duration:** 8h (recommended 24h)

---

## How to run

1. Release build with `StaNativeRuntime` (not Expo Go).
2. Set `EXPO_PUBLIC_REDMI_SOAK=1` or call `startRedmiLongSoakSession(8)`.
3. Execute all 14 scenarios per [REDMI_LONG_SOAK_VALIDATION.md](./REDMI_LONG_SOAK_VALIDATION.md).
4. After ≥8h, export:
   - `getRedmiLongSoakJsonExport()`
   - `getRedmiLongSoakSummaryText()`
5. Attach JSON to this report.

---

## Session summary (fill from export)

| Field | Value |
|-------|-------|
| Device | _pending_ |
| Started | _pending_ |
| Elapsed | _pending_ |
| Target | 8h / 24h |
| `productionReady` | _pending_ |
| Headline | _pending_ |

---

## Critical checks A–H (fill from `summary.criticalChecks`)

| Check | PASS/FAIL | Occurrences | Last at |
|-------|-----------|-------------|---------|
| A native_reconnect_bypass | _pending_ | | |
| B duplicate_reconnect | _pending_ | | |
| C coordinator_ownership_violation | _pending_ | | |
| D reconnect_storm | _pending_ | | |
| E hydration_race | _pending_ | | |
| F timer_resurrection | _pending_ | | |
| G silent_websocket_disconnect | _pending_ | | |
| H miui_delayed_resume | _pending_ | | |

---

## Scenarios observed

_pending — list from `summary.session.scenariosObserved`_

---

## Failure timeline (last 10)

_pending — from `failureTimeline`_

---

## Histograms (end of soak)

### Reconnect latency

_pending — `histograms.reconnectLatencyMs` in boundaryValidation_

### Event loop lag

_pending_

### Memory pressure

_pending_

### Thermal

_pending_

---

## Production readiness (post-soak)

| Score | Pre-soak (framework) | Post 8h device |
|-------|---------------------|----------------|
| Overall | ~91 | _pending_ |

### Redmi operational risk

_pending_

### Unresolved races

_pending_

### Single failure point

_pending_

### Coordinator architecture

_pending_

---

## Sign-off

- [ ] 8h minimum elapsed
- [ ] JSON export attached
- [ ] No critical A/C/D failures
- [ ] Duplicate sockets = 0 at end state
