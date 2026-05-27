# Runtime Long Session Soak Test

Freeze state: `runtime-freeze-v1`

This phase adds readonly long-session soak telemetry and replay validation for Android / Expo / React Native runtime stability. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, provider semantics, reducers, or runtime orchestration semantics.

## Soak Telemetry

`src/services/longSessionRuntimeSoak.ts` tracks:

- Session duration and validation windows for `30min`, `1h`, `background`, `low-memory`, `battery-saver`, and `offline` validation.
- JS thread degradation from event loop lag samples.
- Render drift from render commit duration samples.
- Hydration accumulation drift from deferred activation queue and hydration replay timing.
- Reconnect bursts, retry cascade replay, stale async replay, and offline/online replay.
- Timer drift and listener resurrection samples from watchdog lifecycle counters.

## Replay Diagnostics

Replay events are diagnostic-only:

- AppState resume replay.
- Reconnect allowed/debounced/cooldown replay.
- Offline/online replay.
- Hydration queued/completed/cancelled replay.
- Governor decision replay.
- Deferred activation replay.
- Retry cascade replay.
- Stale async completion replay.

## Pressure Validation

The report exposes validation coverage for long-session risk areas:

- 30 minute runtime validation.
- 1 hour runtime validation.
- Background recovery validation.
- Low-memory recovery validation.
- Battery saver validation.
- Offline recovery validation.

These are represented as telemetry windows and replay labels, not as runtime behavior changes.

## Freeze-Risk Analysis

The long-session soak report identifies:

- Hydration starvation.
- Render burst replay.
- Retry storm replay.
- Stale async completion replay.
- Queue congestion replay.
- JS stall replay.

## Metrics

- `longSessionStabilityScore`
- `reconnectRecoveryScore`
- `hydrationReplaySafetyScore`
- `runtimeDriftContainmentScore`
- `jsThreadStabilityScore`
- `recoveryConsistencyScore`

## Runtime-Freeze Guarantee

This phase is readonly soak telemetry and replay validation only. It does not mutate recommendation, execution, AI reasoning, trading logic, policy, provider semantics, reducers, or runtime orchestration semantics.
