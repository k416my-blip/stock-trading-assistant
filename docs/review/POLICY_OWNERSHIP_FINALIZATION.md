# Policy Ownership Finalization

## Single source of truth

```
RuntimeKernel
  ├─ mergeKernelOwnedPolicy(state, signals, memoryHints)
  ├─ buildPolicyEffects / buildWebsocketPolicyEffects
  ├─ buildAuxiliaryEffects (incl. MEMORY_PRESSURE_CLEANUP emit)
  └─ buildStabilityEffects
        ↓
RuntimeEffectDispatcher → RuntimeEffectExecutor (only mutation site)
```

## Remaining mutations audit (2026-05)

| Location | Mutation | Owner | Notes |
|----------|----------|-------|-------|
| `RuntimeEffectExecutor` | dashboard / WS / hydration / persist / cleanup | **Effect** | Intended |
| `adaptiveRuntimeTuning` | dashboard / WS | Gated | `RUNTIME_KERNEL_OWNS_POLICY` no-op on apply |
| `asyncRuntimeCoordinator` | dashboard / WS | Gated | Same flag |
| `runtimeTelemetryEngine` | persist | Gated | Kernel owns via `TELEMETRY_PERSIST` effect |
| `memoryPressureGuardian` | timer cancel | **Effect** | `MEMORY_PRESSURE_CLEANUP` only |
| `hydrationCollisionGuard` | pause window | **Effect** / serialized path | Not dashboard |
| `websocketStabilityGuard` | schedule reconnect | **Effect** + stability guard | Traced |
| `dashboardFrameStabilizer` | setters | **Effect** only at runtime | |
| `native/*` | fetch snapshot | **Signal** | No policy knobs |
| `src/runtime/kernel/*` | — | **None** | Verified grep clean |

## prepareRuntimeKernelContext

| Question | Answer |
|----------|--------|
| Signal provider OK? | **Yes** — `refreshNativeRuntimeCycle` = `pingEventLoop` + `fetchNativeRuntimeSnapshot` only |
| Hydration collision risk? | **Low** — no hydration start in prep; lock in `runSerializedHydration` |
| Pure kernel violation? | **No** — I/O boundary before `evaluateRuntimeKernelPure` |

## Replay / debug

| Layer | Deterministic? |
|-------|----------------|
| Kernel eval | Yes given frozen `PreparedRuntimeKernelContext` + signals |
| Effect dispatch | Order deterministic; executor I/O is mockable |
| Trackers | Mutable — replay must reset modules or inject snapshot |
| Reconnect trace | `getReconnectSequenceTrace()` for post-mortem |

## Changes in this finalization

1. Removed orphan `applyImminentKillMitigations` / `applyMemoryClassAwareness`
2. Memory cleanup → `MEMORY_PRESSURE_CLEANUP` effect
3. Reconnect sequence tracing + heartbeat drift
4. Telemetry engine persist gated when kernel owns policy
