# Redmi Failure Scenarios (Timeline)

## Scenario: MIUI background kill → resume

| Time | Event | A reconnect | B hydration | C effect queue | D socket | E starvation |
|------|-------|-------------|-------------|----------------|----------|--------------|
| T0 | Background | pause | — | drain | silent | low |
| T1 | Kill timers | — | — | — | disconnect | — |
| T2 | Foreground | gate ON | pending | STABILITY_* coalesced | dup risk | rising |
| T3 | Hydration start | **blocked** | lock | HYDRATION_ENFORCE | — | queue hold |
| T4 | Hydration end | restore_pending | unlock | reconnect guard | token | lag warn |
| T5 | Coordinator | single schedule | idle | execute jitter | one socket | recovery |

## Mitigations applied

- Resume storm gate
- Hydration lock + sequencer
- Reconnect coordinator
- Effect coalescing
- Memory cleanup via effect only

## Residual risk

Concurrent legacy `scheduleWebsocketReconnectWithJitter` bypassing coordinator (grep periodically).
