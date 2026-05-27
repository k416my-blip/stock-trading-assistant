# Runtime Mobile Stability Watchdogs

Freeze tag: `runtime-freeze-v1`

This phase adds readonly mobile stability watchdogs and memory safety instrumentation for Expo / React Native runtime operation. Recommendation, execution, AI reasoning, trading logic, policy semantics, runtime orchestration, provider state machines, reducers, navigation, and runtime semantics remain unchanged.

## Mobile Runtime Audit

Audited targets:

- `src/services/marketDataService.ts`
- `src/components/concierge/RuntimeStabilityDashboardPanel.tsx`
- `src/components/AiAssistantChat.tsx`
- `App.tsx`
- `src/context/ProactiveConciergeContext.tsx`

Observed risk classes:

- market data queue depth can grow during cooldown/rate-limit waits
- deferred UI hydration can accumulate timers after repeated mounts
- chat/dashboard render bursts can hide behind lazy panel activation
- foreground resume and background pause transitions were not captured in a single mobile report
- provider and dashboard render commits lacked a shared watchdog signal

## Memory Safety Instrumentation

Added `src/services/mobileStabilityWatchdog.ts` with readonly tracking for:

- timer scheduled/cleared counts
- deferred activation queue depth
- market data queue depth
- listener registration/removal
- memory pressure events
- lifecycle transitions

No cache deletion, provider mutation, reducer mutation, or runtime rewrite was introduced.

## Render Watchdogs

Added `src/hooks/useRenderWatchdog.ts` and instrumented:

- `AppShell`
- `AIAssistantChat`
- `RuntimeStabilityDashboardPanel`
- `ProactiveConciergeProvider`

The watchdog records render commit latency, long render diagnostics, render burst diagnostics, and commit counts. It does not block or modify rendering.

## Mobile Lifecycle Stabilization

Implemented readonly lifecycle instrumentation in `App.tsx`:

- AppState transition recording
- foreground resume diagnostics
- background pause diagnostics
- listener registration/removal diagnostics
- deferred boot timer tracking

`useDeferredRenderActivation` now tracks scheduled/completed/cancelled activation and avoids duplicate activation scheduling. Hidden UI activation is paused while the app is inactive, reducing background hydration spikes.

## Runtime Freeze Prevention Instrumentation

Implemented:

- deferred queue pressure diagnostics
- duplicated activation prevention diagnostics
- stale deferred activation cancellation diagnostics
- interaction burst protection visibility
- market queue pressure diagnostics

These are observability and UI hydration safety guards only.

## Diagnostics

Added `src/tooling/runtimeMobileStabilityWatchdogReport.ts` and package script:

- `npm run report:mobile-stability-watchdogs`

Report outputs:

- mobile stability report
- runtime watchdog report
- memory pressure report
- render freeze diagnostics

Metrics:

- `runtimeFreezeRiskScore`
- `mobileMemorySafetyScore`
- `hydrationBacklogReduction`
- `renderBurstContainmentScore`
- `lifecycleStabilityScore`

## Runtime Freeze Guarantee

Unchanged:

- recommendation logic
- execution logic
- AI reasoning
- trading logic
- policy semantics
- runtime orchestration
- provider state machines
- reducers
- navigation behavior
- runtime semantics

`runtime-freeze-v1` remains maintained.
