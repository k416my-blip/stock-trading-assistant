# Runtime Production Profiling

Freeze state: `runtime-freeze-v1`

This phase adds readonly production runtime profiling and live device telemetry validation for Android / Expo / React Native. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, reducers, provider semantics, or runtime orchestration semantics.

## Production Frame Profiling

`src/services/productionRuntimeProfiler.ts` aggregates frame and render telemetry:

- Dropped-frame risk.
- Frame budget overflow.
- Render burst duration.
- Commit blocking duration.
- Frame starvation.
- Hydration blocking duration.

Frame data is fed from `runtimeFrameTelemetry` and remains diagnostic-only.

## JS Thread Telemetry

The profiler records:

- JS event-loop lag.
- Long task duration.
- Timer execution drift.
- Hermes GC pause estimation from large event-loop stalls.
- Async queue delay from duplicate async/retry pressure.

## Interaction Profiling

Existing interaction events feed production profiling:

- Chat open latency.
- Chat send latency.
- Portfolio refresh latency.
- Dashboard mount latency.
- AI settings save/open path latency.
- Proactive suggestion render latency.
- Navigation transition latency through `NavigationContainer` state changes.

## Memory Profiling

Memory retention is estimated from runtime hygiene telemetry:

- Timer buildup.
- Listener retention.
- Deferred queue memory pressure.
- Hydration retention.
- Stale closure retention estimation.
- Hidden background retention.

## Android / Expo Profiling

The profiler also tracks:

- AppState resume timing.
- Background wake latency.
- Hydration after resume through AppState + hydration blocking events.
- Reconnect timing.
- Battery saver slowdown.
- Offline recovery latency.
- Bridge congestion estimation from timer buildup and slow reconnect paths.

## Live Telemetry Aggregation

The report provides rolling snapshots:

- `5m`
- `30m`
- `1h`

Each snapshot includes peak pressure duration, frame-drop hotspots, JS stall hotspots, and reconnect instability hotspots.

## Metrics

- `frameStabilityScore`
- `jsThreadHealthScore`
- `interactionResponsivenessScore`
- `hydrationBlockingScore`
- `runtimeLatencyScore`
- `memoryRetentionScore`
- `longSessionPerformanceScore`

## Runtime-Freeze Guarantee

This phase is readonly profiling and live telemetry aggregation only. It does not mutate recommendation, execution, AI reasoning, trading logic, policy, provider semantics, reducers, or runtime orchestration semantics.
