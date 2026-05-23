# Effect Duplication Analysis

## Before

- Multiple anomalies → multiple `STABILITY_RECONNECT_GUARD` with different dedupeKeys
- Dispatcher dedupe (400ms) only — kernel could emit 3+ same-kind effects per tick

## After

### Kernel coalescing (`coalesceRuntimeEffects`)

One effect per kind for stability/critical kinds per tick.

### Stability builder

Anomaly loop uses `emittedKinds` Set — first anomaly wins per effect kind.

### Coalesced dedupe keys

- `stab-ws-coalesced`
- `stab-miui-coalesced`

## Remaining duplication

Policy effects + stability effects may both touch WS (e.g. `WS_RECONNECT_JITTER` + `STABILITY_RECONNECT_GUARD`) — intentional layered defense; coordinator prevents double schedule.
