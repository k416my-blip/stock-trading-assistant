# Runtime Device Adaptive Optimization

Freeze state: `runtime-freeze-v1`

This phase adds readonly device-aware runtime optimization and thermal/battery intelligent load control for Android / Expo / React Native. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, provider semantics, reducers, or runtime orchestration semantics.

## Device Profiling Layer

`src/services/runtimeDeviceAdaptiveOptimization.ts` estimates device capability using the Android native runtime bridge when available and heuristic telemetry otherwise:

- RAM tier: `high`, `standard`, `low`, `unknown`.
- Android performance class: `flagship`, `standard`, `constrained`, `degraded`.
- Thermal state estimate.
- Battery saver detection.
- Background restriction detection.
- Frame budget estimation.
- Bridge congestion estimation.
- Hydration throughput estimation.

## Runtime Adaptive Tiers

The runtime adaptive tier is one of:

- `flagship`
- `standard`
- `constrained`
- `degraded`

The tier is derived from thermal risk, battery pressure, bridge congestion, frame starvation, and memory pressure. It is used only for low-priority runtime pacing.

## Adaptive Hydration Pacing

Low-priority hydration is paced using:

- Hydration batch sizing.
- Queue pacing.
- Staged hydration replay.
- Frame-safe hydration scheduling.
- Interaction-priority hydration.
- Background hydration suppression.

The pacing layer runs before self-healing and adaptive governor decisions, so constrained devices avoid mounting heavy hidden UI during pressure spikes.

## Thermal-Aware Governor

Thermal slowdown mode increases low-priority delay for analytics, archive, dashboard, and proactive hydration. It also records thermal recovery diagnostics. It does not mutate app state or business logic.

## Battery-Aware Runtime Mode

Battery saver mode triggers:

- Low-power hydration pacing.
- Background refresh suppression for low-priority runtime work.
- Reconnect pacing diagnostics.
- Reduced low-priority runtime pressure.

Interaction priority remains preserved.

## Bridge Congestion Protection

Bridge congestion is estimated from production profiling and native bridge pending estimates. Protection behavior includes:

- Interaction-safe scheduling.
- Navigation transition protection.
- Heavy dashboard throttling.
- Mount burst prevention through deferred hydration pacing.

## Android Lifecycle Optimization

AppState transitions record:

- Resume pacing.
- Foreground staged recovery.
- Hidden screen hydration suppression.
- Interaction-priority recovery.

Offline/reconnect/proactive scopes are paced only when they are low-priority runtime activity.

## Metrics

- `thermalRiskScore`
- `batteryPressureScore`
- `bridgeCongestionScore`
- `frameStarvationRiskScore`
- `hydrationThroughputScore`
- `recoveryScalingScore`
- `adaptiveOptimizationScore`

## Runtime-Freeze Guarantee

This phase only adds readonly device profiling and low-priority pacing. Recommendation, execution, AI reasoning, trading logic, policy, provider semantics, reducers, and runtime orchestration semantics are unchanged.
