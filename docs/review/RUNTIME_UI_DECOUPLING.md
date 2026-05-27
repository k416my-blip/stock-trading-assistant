# Runtime UI Decoupling

Freeze tag: `runtime-freeze-v1`

This phase isolates React/UI runtime hotspots without changing runtime logic, recommendation logic, execution logic, AI reasoning, trading logic, or policy semantics.

## Executed Split

`RuntimeStabilityDashboardPanel.tsx` no longer owns the observer reality, inter-civilization, and governance freeze archive panel JSX. Those cold analytics panels were moved into:

- `src/components/concierge/RuntimeCivilizationArchivePanels.tsx`

The new component is memoized and owns its own archive dashboard imports. The primary stability dashboard keeps the same render order and still uses the same telemetry dashboard row budget via `consumeTelemetryDashboardRow()`.

## Rerender Hotspots

Primary hotspots remain:

- `RuntimeStabilityDashboardPanel.tsx`
- `RuntimeStabilityCollapseRadar.tsx`
- `AiAssistantChat.tsx`
- `AISettingsScreen.tsx`

The dashboard archive panels now have an independent render boundary. The largest remaining rerender risk is still context fan-out from `AppContext.tsx` and `ProactiveConciergeContext.tsx`.

## Heaviest Contexts

Context decomposition candidates:

- `src/context/ProactiveConciergeContext.tsx`
- `src/context/AppContext.tsx`

These were not behavior-split in this phase because they carry recommendation, execution, AI orchestration, portfolio, and policy-adjacent state. A future safe pass should introduce selector hooks first, then split providers only after behavior parity tests exist.

## Dashboard Render Reductions

Implemented:

- archive civilization/freeze panels moved out of primary dashboard file
- archive panel imports isolated from primary dashboard imports
- archive panel string/list formatting moved out of primary dashboard inference path
- memo boundary added for cold archive analytics

Prepared but not behavior-mutated:

- collapsed analytics mode
- dashboard virtualization candidates
- optional telemetry separation
- observability debug panel separation

## TS Complexity Reductions

Implemented:

- primary dashboard import surface reduced
- archive dashboard constants/getters moved to a smaller file
- archive dashboard JSX moved out of the primary compile/inference path

Remaining TS candidates:

- split `AISettingsScreen.tsx` into credential, provider-health, and preference sections
- split `AiAssistantChat.tsx` into composer/history/runtime-status modules
- split `ProactiveConciergeContext.tsx` with selector-based provider boundaries
- split `AppContext.tsx` by portfolio, API keys, settings, and execution-adjacent domains

## Context Split Results

Executed:

- no behavior-changing context split
- no recommendation/execution/AI/policy state movement
- no runtime rewrite

Planned safe path:

- add read-only selector hooks
- memoize derived state behind existing providers
- introduce provider boundaries only after parity tests
- avoid changing provider values used by trading/recommendation logic

## Cursor Indexing Improvements

Expected improvements:

- primary dashboard file is smaller and has fewer archive runtime imports
- archive dashboard code can be indexed independently
- Cursor edits in primary stability UI should touch fewer archive analytics symbols

Remaining pressure is dominated by giant context and screen files.

## Metrics

Tracked by `npm run report:ui-decoupling`:

- `rerenderReductionScore`
- `contextIsolationScore`
- `dashboardHydrationReduction`
- `TSComplexityReduction`
- `cursorIndexPressureReduction`

## Forbidden Zones

Forbidden:

- semantic expansion
- ontology expansion
- civilization expansion
- runtime rewrite
- recommendation rewrite
- AI behavior mutation
- execution mutation
- trading logic mutation
- policy semantic mutation

`runtime-freeze-v1` remains maintained.
