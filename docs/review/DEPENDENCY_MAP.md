# Dependency Map (runtime-focused)

## `src/runtime/orchestrator/` internal

| Module | Imports from |
|--------|----------------|
| `runtimeOrchestrator.ts` | `runtimePolicyEngine`, `nativeRuntimeBridge`, `telemetryConfidence`, types/constants |
| `runtimeOrchestratorIntegration.ts` | orchestrator, scheduler, memory guardian, redmi guard, telemetry storage, **nativeRuntimeIntegration**, kill predictor |
| `runtimePolicyEngine.ts` | types/constants only |
| `asyncPriorityScheduler.ts` | policy types, async coordinator (services) |
| `memoryPressureGuardian.ts` | telemetry metrics |
| `longSessionSurvivability.ts` | telemetry metrics |
| `redmiOrchestratorGuard.ts` | mobile redmi constants |

No circular imports within `src/runtime/orchestrator/`.

## UI → runtime → native (direction)

```
screens / components (concierge panels)
  → context/ProactiveConciergeContext (dynamic import)
    → services/runtimeTelemetryEngine
    → runtime/orchestrator/runtimeOrchestratorIntegration
      → native/runtime/nativeRuntimeIntegration
        → native/runtime/nativeRuntimeBridge
          → NativeModules.StaNativeRuntime (Android only)
```

**Rule**: UI does not import `NativeModules` directly; native access is centralized in `nativeRuntimeBridge.ts`.

## Services ↔ orchestrator

- `runtimeTelemetryEngine` → `getLastNativeDashboardExtension` (read-only dashboard extension).
- `websocketStabilityGuard`, `hydrationCollisionGuard`, `mobileRedmiRuntime` → call `miuiReclaimDetector` / `lifecycleTimeline` via dynamic import (avoids hard cycles).
- `productionStabilityRuntime` ← orchestrator sets proactive gates.

## Potential coupling notes

- `nativeRuntimeIntegration` imports `runtimeTelemetryStorage` and orchestrator types — keep native layer free of UI imports (currently satisfied).
- `runtimeTelemetryEngine` imports `nativeRuntimeIntegration` for dashboard bundle only — acceptable one-way read after orchestrator cycle.

## Not in ZIP but depended on

- `src/constants/*` — thresholds for orchestrator/telemetry
- `src/services/asyncRuntimeCoordinator.ts`, `performanceCostRuntime.ts`, `mobileRedmiRuntime.ts`

Reviewers should assume constants mirror filenames under `src/constants/runtimeOrchestrator.ts`, `runtimeTelemetry.ts`, `nativeRuntimeBridge.ts`.
