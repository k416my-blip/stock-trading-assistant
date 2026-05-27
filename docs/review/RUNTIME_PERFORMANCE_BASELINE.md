# Runtime Measured Performance Baseline & Cursor Load Benchmarking

Freeze tag: `runtime-freeze-v1`

This report measures Cursor, TypeScript, verify, registry, and tooling load after production slimming. It adds benchmark tooling only and does not add a runtime layer or change runtime behavior.

## Measured Runtime Costs

Command durations measured with PowerShell `Stopwatch`:

- `npm run typecheck`: 12,245 ms
- `npm run verify:critical`: 5,676 ms
- `npm run verify:runtime-light`: 1,762 ms

Benchmark tooling:

- command: `npm run benchmark:runtime-baseline`
- TypeScript files scanned: 2,428
- total TypeScript bytes scanned: 8,068,313
- total import count: 9,901
- benchmark process RSS memory: 112.93 MB

## Measured Cursor Pressure

Static pressure indicators:

- TS server pressure: 0.807
- file indexing pressure: 2.023
- import graph depth: 12
- registry traversal cost: 6
- scenario lookup complexity: 14
- verify dependency depth: 6
- tooling namespace load: 4

Interpretation: the main Cursor pressure now comes from large app/context/dashboard files and total indexed file count, not the runtime-light registry itself.

## Measured TS Bottlenecks

TS hotspot top 10 by type hotspot score:

1. `src/components/concierge/RuntimeStabilityDashboardPanel.tsx` — score 506.5, 73,499 bytes, 56 imports
2. `src/screens/AiSettingsScreen.tsx` — score 445.25, 54,574 bytes, 23 imports
3. `src/context/ProactiveConciergeContext.tsx` — score 380.5, 136,522 bytes, 144 imports
4. `src/components/AiAssistantChat.tsx` — score 379.75, 67,076 bytes, 59 imports
5. `src/context/AppContext.tsx` — score 244, 113,726 bytes, 94 imports
6. `src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime.ts` — score 123, 69,534 bytes, 8 imports
7. `src/components/concierge/RuntimeStabilityCollapseRadar.tsx` — score 120.75, 18,728 bytes, 23 imports
8. `src/components/concierge/CapitalAllocationPanel.tsx` — score 120.5, 9,054 bytes, 6 imports
9. `src/components/concierge/PortfolioRiskExposurePanel.tsx` — score 102, 9,751 bytes, 6 imports
10. `src/components/PortfolioConstructionPanel.tsx` — score 100.75, 12,427 bytes, 7 imports

## Heaviest Files Top 10

1. `src/context/ProactiveConciergeContext.tsx` — 136,522 bytes, 3,013 lines, 144 imports
2. `src/context/AppContext.tsx` — 113,726 bytes, 2,751 lines, 94 imports
3. `src/native/runtime/nativeRuntimeIntegration.ts` — 77,791 bytes, 1,467 lines, 43 imports
4. `src/components/concierge/RuntimeStabilityDashboardPanel.tsx` — 73,499 bytes, 1,362 lines, 56 imports
5. `src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime.ts` — 69,534 bytes, 1,724 lines, 8 imports
6. `src/components/AiAssistantChat.tsx` — 67,076 bytes, 1,834 lines, 59 imports
7. `src/screens/AiSettingsScreen.tsx` — 54,574 bytes, 1,309 lines, 23 imports
8. `src/services/aiContextCompressor.ts` — 32,137 bytes, 560 lines, 3 imports
9. `src/services/selfEvaluationEngine.ts` — 30,538 bytes, 870 lines, 6 imports
10. `src/services/aiStrategyService.ts` — 29,612 bytes, 972 lines, 29 imports

## Measured Registry Costs

Runtime-light baseline comparison:

- registry load count: 16 -> 6
- scenario traversal count: 26 -> 14
- module hydration count: 26 -> 0
- startup duration estimate: 1,600 ms -> 1,250 ms

Measured hydration:

- cold registry hydration: 7.79 ms
- warm registry hydration: 1.03 ms
- cold dashboard metadata load: 11.15 ms
- warm dashboard metadata load: 1.05 ms

## Measured Verify Costs

Measured verify costs:

- typecheck: 12.245 s
- critical tier: 5.676 s
- runtime-light: 1.762 s

Verify tier effectiveness: 0.625

## Archive Efficiency Report

- archived scenario savings: 0.462
- optional scenario savings: 0.308
- deferred import effectiveness: 1.0
- verify tier effectiveness: 0.625

## Operational Sustainability Scores

- maintainability score: 0.565
- Cursor scalability score: 0.552
- compile stability score: 0.578
- tooling isolation score: 0.625
- runtime simplicity score: 0.696

## Future Safe Optimization Zones

Safe future reductions:

- keep full runtime verification on nightly/manual paths
- archive low-frequency semantic review docs outside active indexing
- keep production registry metadata separate from full frozen inventory
- split `RuntimeStabilityDashboardPanel.tsx` into lazy domain panels
- split large context providers by stable ownership boundaries
- keep dashboard/debug panels collapsed or out of the default render path

TS optimization candidates:

- `src/components/concierge/RuntimeStabilityDashboardPanel.tsx`
- `src/screens/AiSettingsScreen.tsx`
- `src/context/ProactiveConciergeContext.tsx`
- `src/components/AiAssistantChat.tsx`
- `src/context/AppContext.tsx`

Dashboard simplification candidates:

- archive dashboard candidates
- observability debug panels
- long-form phase summaries

## Forbidden Mutation Zones

Forbidden:

- semantic expansion
- ontology expansion
- civilization expansion
- runtime behavior changes
- recommendation changes
- execution changes
- AI reasoning changes
- trading logic changes
- auto cleanup
- auto deletion
- runtime rewrite
- semantic rewrite

`runtime-freeze-v1` remains maintained.
