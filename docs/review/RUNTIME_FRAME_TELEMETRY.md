# Runtime Frame Telemetry

Freeze state: `runtime-freeze-v1`

This phase adds readonly React Native / Expo frame diagnostics for Android device operation. It does not rewrite providers, reducers, runtime orchestration, recommendation logic, execution logic, AI reasoning, trading logic, or policy semantics.

## Scope

- JS thread stall telemetry through event loop lag sampling in `AppShell`.
- Render timing telemetry through the existing render watchdog hook.
- Hydration frame timing through deferred render activation completion records.
- Interaction latency telemetry for AI chat, dashboard mount, AI settings preference save, proactive suggestion render, and portfolio refresh.
- Expo/RN lifecycle telemetry for AppState timing, background/foreground resume spikes, timer accumulation, and listener bursts.

## Readonly Telemetry Model

`src/services/runtimeFrameTelemetry.ts` keeps an in-memory diagnostics buffer and exposes `getRuntimeFrameTelemetryReport()`. The report is observational only:

- `frameStallReport`
- `renderTimingReport`
- `interactionLatencyReport`
- `hydrationTimingReport`
- `mobileFramePressureReport`

The service records events and scores only. It does not dispatch runtime actions, mutate trading state, alter recommendation behavior, throttle providers, or change orchestration semantics.

## Metrics

- `jsThreadHealthScore`
- `renderBurstScore`
- `hydrationFramePressureScore`
- `interactionLatencyScore`
- `mobileFrameSafetyScore`
- `expoRuntimeResponsivenessScore`

These scores summarize observed pressure from event loop lag, long tasks, render commit spikes, render bursts, hydration blocking risk, interaction latency, AppState resume spikes, timer accumulation, and listener bursts.

## Hotspot Coverage

- `App.tsx`: JS event loop lag, AppState timing, resume spike diagnostics.
- `RuntimeStabilityDashboardPanel.tsx`: dashboard mount latency and render commit timing.
- `AIAssistantChat.tsx`: chat open, send, proactive suggestion focus, and suggestion render latency.
- `ProactiveConciergeContext.tsx`: render timing through the existing render watchdog.
- `AppContext.tsx`: provider render timing, portfolio refresh latency, and AI settings preference-save latency.

## Runtime-Freeze Guarantee

This phase only adds readonly telemetry records and static reporting. It preserves `runtime-freeze-v1` by avoiding new civilization layers, ontology expansion, provider rewrites, reducer rewrites, runtime behavior mutation, recommendation mutation, execution mutation, AI reasoning mutation, and trading logic mutation.
