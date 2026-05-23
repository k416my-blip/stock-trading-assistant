# Runtime Final Hazard Elimination

## Summary

Completes hazard removal without architecture rewrite. Kernel remains policy owner; executor remains sole mutation path.

## Changes

| Hazard | Fix |
|--------|-----|
| memoryPressureGuardian inline cleanup | Removed `observeMemoryPressure`; cleanup only via `MEMORY_PRESSURE_CLEANUP` effect |
| Hydration + WS restore | `hydrationRestoreSequencer` + `hydrationReconnectGate` + lock integration |
| Reconnect race | `reconnectCoordinator` — single budget/token owner; `executeWebsocketReconnectJitter` vs budget |
| Effect duplication | `coalesceRuntimeEffects` in kernel + anomaly kind merge in `buildStabilityEffects` |
| Tracker replay | `trackerReplaySnapshot` export/reset |
| Resume storm | `noteResumeStormGate` on foreground tick |

## Kernel purity

`src/runtime/kernel/` — no direct mutations. Coalescing is pure list transform.

## Files

- `src/runtime/kernel/effectCoalescing.ts`
- `src/runtime/stability/hydrationReconnectGate.ts`
- `src/runtime/stability/hydrationRestoreSequencer.ts`
- `src/runtime/stability/reconnectCoordinator.ts`
- `src/runtime/stability/trackerReplaySnapshot.ts`
