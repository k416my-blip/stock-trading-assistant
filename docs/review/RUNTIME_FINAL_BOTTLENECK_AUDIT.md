# Runtime Final Bottleneck Audit

Freeze tag: `runtime-freeze-v1`

This is a readonly profiling, static analysis, import graph, Cursor pressure, and freeze integrity audit. It does not change runtime behavior, providers, reducers, state machines, recommendation logic, execution logic, AI reasoning, orchestration, trading logic, or policy semantics.

## Runtime Bottleneck Report

Top 10 bottlenecks by compile amplification and runtime/UI pressure:

1. `src/components/concierge/RuntimeStabilityDashboardPanel.tsx` — 65,154 bytes, 1,205 lines, 51 imports, TS score 468.25
2. `src/context/ProactiveConciergeContext.tsx` — 136,947 bytes, 3,024 lines, 144 imports, TS score 381
3. `src/screens/AiSettingsScreen.tsx` — 54,574 bytes, 1,309 lines, 23 imports, TS score 445.25
4. `src/components/AiAssistantChat.tsx` — 67,104 bytes, 1,834 lines, 59 imports, TS score 379.75
5. `src/context/AppContext.tsx` — 114,753 bytes, 2,781 lines, 94 imports, TS score 251
6. `src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime.ts` — 69,534 bytes, 1,724 lines, 8 imports, TS score 123
7. `src/components/concierge/RuntimeStabilityCollapseRadar.tsx` — 18,728 bytes, 382 lines, 23 imports, TS score 120.75
8. `src/native/runtime/nativeRuntimeIntegration.ts` — 77,791 bytes, 1,467 lines, 43 imports, TS score 54.75
9. `src/components/concierge/CapitalAllocationPanel.tsx` — 9,054 bytes, 209 lines, 6 imports, TS score 120.5
10. `src/services/marketDataService.ts` — 28,490 bytes, 948 lines, 22 imports, TS score 98

Hydration bottlenecks:

- cold registry hydration: 7.29 ms
- cold dashboard metadata load: 10.81 ms
- module hydration reduction already achieved: 26 -> 0

## TS Pressure Report

Slow inference and symbol pressure are concentrated in:

- dashboard JSX density
- wide React context value surfaces
- AI settings screen UI/type breadth
- AI chat structured rendering
- orchestration/runtime integration files

Main symbol explosion sources:

- large React context value surfaces
- dashboard archive analytics JSX
- AI chat structured response rendering
- settings screens with wide provider access

## Cursor Pressure Report

Measured pressure:

- indexing pressure: 2.027
- TypeScript files scanned: 2,432
- import edges counted: 9,913
- TypeScript bytes indexed: 8,091,027

Actual Cursor risk areas:

- `ProactiveConciergeContext.tsx`
- `AppContext.tsx`
- `RuntimeStabilityDashboardPanel.tsx`
- `AiAssistantChat.tsx`
- `AiSettingsScreen.tsx`
- `nativeRuntimeIntegration.ts`

Edit/autocomplete latency is most likely from large context providers and dashboard/AI screen JSX density, not from frozen runtime registry traversal.

## Import Graph Report

Import graph depth: 12

Oversized import hubs:

- `ProactiveConciergeContext.tsx`: 144 imports
- `AppContext.tsx`: 94 imports
- `AiAssistantChat.tsx`: 59 imports
- `RuntimeStabilityDashboardPanel.tsx`: 51 imports
- `nativeRuntimeIntegration.ts`: 43 imports

Cold-only dependency chains:

- runtime archive dashboard analytics
- freeze/economics/operational-core tooling reports
- nightly/full runtime verification registry

## Rerender Hotspot Report

Rerender hotspots:

- `AiAssistantChat.tsx`
- `RuntimeStabilityDashboardPanel.tsx`
- `AiSettingsScreen.tsx`
- `RuntimeCivilizationArchivePanels.tsx`

Context propagation chains:

- AppContext -> AIAssistantChat, ProactiveConciergeProvider
- ProactiveConciergeContext -> AIAssistantChat optional proactive analytics, Proactive screens/cards
- Runtime dashboard archive analytics -> RuntimeStabilityDashboardPanel

## Metrics

- `estimatedCursorLatency`: 0.631
- `estimatedTSLoadReduction`: 0.29
- `estimatedHotReloadGain`: 0.179
- `indexingPressureScore`: 0.676
- `dependencyComplexityScore`: 0.762
- `runtimeFreezeIntegrityScore`: 1.0

## Optimization Risk Assessment

More optimization worth it: yes, targeted only.

Estimated remaining gains: small to moderate. Remaining gains are concentrated in `AppContext`, `ProactiveConciergeContext`, `AIAssistantChat`, and `AiSettingsScreen`. Broad architecture changes are not worth the behavior risk.

Optimization danger level: high.

Recommended stopping point:

Stop broad runtime/civilization optimization here. Only perform targeted UI/context extractions with parity tests and no provider/reducer semantics changes.

## Freeze Integrity Audit

Confirmed:

- `runtime-freeze-v1` intact
- no semantic drift
- no provider behavior drift
- no orchestration mutation
- no reducer rewrite
- no state machine rewrite
- no recommendation mutation
- no execution mutation
- no AI reasoning mutation
- no trading logic mutation
- no policy semantic mutation

## Forbidden Mutation Zones

Forbidden:

- runtime behavior
- recommendation logic
- execution logic
- AI reasoning
- orchestration
- trading logic
- policy semantics
- state machines
- reducers
- provider behavior
- semantic expansion
- ontology expansion
- architecture expansion
