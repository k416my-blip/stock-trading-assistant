# Redmi Note 13 Pro Runtime Risk Review (Strict)

Device: Redmi Note 13 Pro, MIUI/HyperOS, long-session concierge + telemetry.

| Threat | Severity | Ownership | Mitigation status |
|--------|----------|-----------|-------------------|
| Thermal throttling | High | Kernel policy merge | compact + WS safe mode |
| MIUI battery optimization | Critical | Native signal + stability | diagnostics + debounce |
| WebSocket suspend | High | Effect + storm guard | budget/backoff/trace |
| App background kill | Critical | Kill predictor + IMMINENT effect | partial — no OS hook |
| Timer drift | Medium | miuiBatteryDiagnostics | observe only |
| Reconnect duplication | High | ReconnectTracker + trace | mitigated, needs device soak |
| Hydration race | High | HydrationLock | mitigated; WS restore gap remains |
| Memory reclaim | High | MEMORY_PRESSURE_CLEANUP effect | 30s cooldown anti-race |
| Async starvation | High | Stability warn + queue compaction | warn-only for promises |

## Production readiness notes

- Paper trading only (`realTradingEnabled=false`) — OK
- Kernel has no direct mutations — OK
- Dashboard readonly — OK
- Legacy telemetry persist path gated — OK
- Full `test:unit` RN parse issues — unchanged

## Highest-risk gap

**Resume storm:** foreground + network restore + hydration + WS reconnect in same tick without global coordinator — can still spike queue despite per-layer guards.
