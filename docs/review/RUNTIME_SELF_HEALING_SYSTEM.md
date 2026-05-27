# Runtime Self-Healing System

Freeze state: `runtime-freeze-v1`

This phase adds readonly anomaly detection, runtime health scoring, and self-healing stabilization for low-priority Android / Expo / React Native runtime activity. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, reducers, provider semantics, or runtime orchestration semantics.

## Anomaly Detection

`src/services/runtimeSelfHealingSystem.ts` integrates existing diagnostics from:

- Runtime frame telemetry.
- Production runtime profiling.
- Adaptive runtime governor.
- Runtime chaos resilience.
- Runtime memory pressure defense.
- Long-session runtime soak telemetry.

Detected anomaly classes:

- Freeze precursor.
- JS stall escalation.
- Dropped-frame escalation.
- Hydration starvation.
- Reconnect storm.
- Retry cascade.
- Render burst escalation.
- Queue congestion escalation.
- Memory pressure escalation.
- Interaction latency degradation.

## Runtime Health Scoring

The runtime health dashboard exposes:

- `runtimeHealthScore`
- `interactionHealthScore`
- `hydrationHealthScore`
- `memoryHealthScore`
- `reconnectHealthScore`
- `renderHealthScore`
- `jsThreadHealthScore`

Escalation tiers are `normal`, `elevated`, `degraded`, and `critical`.

## Self-Healing Scope

Self-healing is limited to low-priority runtime activity:

- Low-priority hydration suppression.
- Analytics/archive delayed activation.
- Hidden dashboard throttling.
- Proactive refresh suppression.
- Deferred queue cleanup.
- Staged recovery and gradual hydration replay.
- Low-priority reconnect/retry cooldown diagnostics.

Interaction and normal-priority runtime activity are preserved.

## Critical Tier Behavior

When runtime health reaches critical:

- Low-priority hydration is paused and retried later.
- Analytics/archive hydration is stopped for the current attempt.
- Proactive background refresh can be suppressed.
- Retry/reconnect containment diagnostics are strengthened for low-priority scopes.
- Recovery moves through staged replay rather than forcing immediate hydration.

## Recovery Engine

The recovery model records:

- Staged recovery.
- Cooldown recovery.
- Interaction-priority recovery.
- Foreground recovery.
- Gradual hydration replay.
- Queue replay pacing.

These are diagnostics and scheduling decisions for low-priority UI/runtime work only.

## Runtime-Freeze Guarantee

This phase does not mutate recommendation, execution, AI reasoning, trading logic, policy, provider semantics, reducers, or runtime orchestration semantics. Self-healing only gates low-priority UI hydration and background/proactive runtime activity.
