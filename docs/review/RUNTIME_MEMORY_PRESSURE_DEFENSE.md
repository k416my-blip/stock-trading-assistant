# Runtime Memory Pressure Defense

Freeze state: `runtime-freeze-v1`

This phase adds readonly memory pressure diagnostics and adaptive cleanup around timers, listeners, deferred hydration queues, inactive hydration retention, stale closure estimates, and background memory pressure. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, provider semantics, reducers, or runtime orchestration semantics.

## Memory Pressure Telemetry

`src/services/runtimeMemoryPressureDefense.ts` tracks:

- Estimated memory growth from active timers, active listeners, and deferred hydration queues.
- Timer lifecycle retention and release.
- Listener lifecycle retention and release.
- Deferred queue retention, completion, cancellation, and low-priority eviction.
- Inactive hydration retention while the app is backgrounded or inactive.
- Stale closure retention estimates from duplicate deferred activation attempts.
- Background cleanup activity from AppState transitions.

## Adaptive Cleanup

Cleanup is limited to runtime hygiene boundaries:

- Inactive deferred activation cleanup.
- Abandoned hydration cancellation on unmount.
- Background suspended hydration retry scheduling.
- Timer lifecycle release through watchdog timer tracking.
- Listener lifecycle release through existing listener removal paths.
- Low-priority queue eviction for proactive, analytics, and archive hydration.

The cleanup system never deletes persisted data, never mutates trading state, and never rewrites application semantics.

## Queue Containment

Low-priority hydration can be evicted and retried when memory pressure appears:

- Deferred queue cap: eight active deferred activations.
- Timer pressure: elevated when many active timers are retained.
- Listener pressure: elevated when listener count grows.
- Memory mode: active when battery saver or offline mode is detected.
- Background mode: low-priority hydration is suspended with a longer retry delay.

## Lifecycle Protection

- `App.tsx` records background/active memory cleanup diagnostics.
- `useDeferredRenderActivation` records queue cleanup, inactive hydration cleanup, stale closure estimates, and abandoned activation cancellation.
- `AIAssistantChat` records unmount abort cleanup and tracks slow-response/send watchdog timers.
- `RuntimeStabilityDashboardPanel` records inactive dashboard cleanup on unmount.
- `ProactiveConciergeContext` records cleanup when proactive refresh is suppressed or listener unregister paths run.

## Metrics

- `runtimeMemorySafetyScore`
- `listenerLeakPreventionScore`
- `timerRetentionSafetyScore`
- `deferredQueueContainmentScore`
- `inactiveHydrationCleanupScore`
- `mobileMemoryResilienceScore`

## Runtime-Freeze Guarantee

This phase is restricted to readonly diagnostics and lifecycle cleanup around hidden/deferred UI work. Recommendation, execution, AI reasoning, trading logic, policy, provider semantics, reducers, and runtime orchestration semantics are unchanged.
