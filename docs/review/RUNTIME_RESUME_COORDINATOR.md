# Runtime Resume Coordinator Layer

## Purpose

Serialize MIUI/Redmi resume hazards in one pure coordinator:

- resume storm
- reconnect burst
- hydration overlap
- telemetry burst
- async resume race

Kernel remains pure; coordinator is a pure state machine; mutations run only in `RuntimeEffectExecutor`.

## Architecture

```
observeRuntimeStabilityTick (signal)
  └─ observeResumeCoordinatorTick → transitionResumeCoordinator (pure)

evaluateRuntimeKernelPure → assembleRuntimeDecision
  └─ buildResumeCoordinatorEffects(snapshot)
  └─ coalesceRuntimeEffects (resume wins over duplicate reconnect)

dispatchRuntimeEffects → RuntimeEffectExecutor
  └─ RESUME_* → reconnectCoordinator / hydration sequencer / lifecycle
```

## Phase ordering

1. `resume_gate` — global gate, telemetry defer, async clamp flags
2. `hydration` — pause window + lock (if overlap)
3. `telemetry_defer` — burst hold
4. `async_drain` — queue pressure
5. `ws_restore` — single budgeted reconnect sequence
6. `complete` → `idle`

## Effect kinds

| Kind | Executor action |
|------|-----------------|
| `RESUME_COORDINATOR_OBSERVE` | lifecycle trace only |
| `RESUME_GLOBAL_GATE` | `applyResumeGlobalGate` |
| `RESUME_SERIALIZE_HYDRATION` | lock + pause + sequence start |
| `RESUME_DEFER_TELEMETRY` | lifecycle defer marker |
| `RESUME_ASYNC_BURST_CLAMP` | `setAsyncConcurrentLimit(2)` |
| `RESUME_WS_RESTORE_SEQUENCE` | `scheduleDelayedWebsocketRestore` |

## Invariants

- No dashboard/native mutation from coordinator module
- `src/runtime/kernel/` has no service imports (grep audit)
- Reconnect coalescing: `RESUME_WS_RESTORE_SEQUENCE` suppresses `STABILITY_RECONNECT_GUARD` / `WS_RECONNECT_JITTER` per tick
- Replay: `resetRuntimeResumeCoordinatorForTest` in `resetAllRuntimeTrackersForReplay`

## Verification

```bash
npm run typecheck
npm run test:unit -- tests/unit/runtimeCoordinator
rg "setDashboard|setWebsocket" src/runtime/kernel src/runtime/coordinator
```
