# Runtime Context Selector Isolation

Freeze tag: `runtime-freeze-v1`

This phase reduces render subscription fan-out without changing runtime logic, recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, or runtime orchestration.

## Selector Extraction Results

Added readonly selector hooks in `AppContext.tsx`:

- `useAppSelector`
- `useAppAiChatSelector`
- `useAppProactiveRuntimeSelector`

Added selector hooks in `ProactiveConciergeContext.tsx`:

- `useProactiveConciergeSelector`
- `useProactiveConciergeOptionalSelector`

`AIAssistantChat.tsx` now reads AppContext through `useAppAiChatSelector`, limiting its declared AppContext dependency to:

- `sendAiStrategyMessage`
- `aiPreferences`
- `saveAiPreferences`
- `aiApiKey`

`ProactiveConciergeProvider` now reads AppContext through `useAppProactiveRuntimeSelector`, limiting its declared AppContext dependency to:

- `state`
- `priceSync`
- `aiPreferences`
- `marketRegime`

## Rerender Fan-Out Reductions

Implemented reductions:

- direct broad `useApp()` access removed from `AIAssistantChat.tsx`
- broad `useApp()` access removed from `ProactiveConciergeProvider`
- context slice types added for AI chat and proactive runtime access
- archive dashboard panels remain isolated behind a memoized render boundary

Provider state machines and reducer/update logic were not changed.

## Heaviest Subscriptions

Remaining heavy subscriptions:

- `AppContext.tsx`: portfolio state, API keys, AI preferences, execution actions, market regime
- `ProactiveConciergeContext.tsx`: proactive suggestions, dashboard bundles, runtime telemetry, orchestration outputs
- `AIAssistantChat.tsx`: AI chat, proactive optional analytics, runtime dashboard slices
- `RuntimeStabilityDashboardPanel.tsx`: runtime dashboard getter surface

## Provider Segmentation Results

Executed:

- readonly selector access layer
- typed context slice extraction
- dashboard archive provider-like render boundary via component isolation

Deferred for safety:

- physical provider split
- reducer/state machine redesign
- execution-adjacent state relocation
- recommendation/AI behavior movement

## TS Inference Reductions

Implemented:

- exported `AppContextValue` for typed selector slices
- introduced `AppAiChatContextSlice`
- introduced `AppProactiveRuntimeContextSlice`
- exported `ProactiveConciergeContextValue` for selector hooks

This reduces repeated inferred shape pressure in consumers while preserving provider value semantics.

## Hot Reload Improvements

Expected improvements:

- edits in `AIAssistantChat.tsx` now reference a named context slice rather than broad `useApp()` destructuring
- proactive provider dependency surface is named and easier for Cursor/TS to reason about
- archive dashboard analytics are already isolated from primary dashboard hot reload paths

## Metrics

Tracked by `npm run report:context-selector-isolation`:

- `fanoutReductionScore`
- `selectorIsolationScore`
- `subscriptionReductionScore`
- `providerSegmentationScore`
- `TSInferenceReduction`
- `hotReloadPressureReduction`

## Runtime Freeze Policy

Forbidden:

- semantic expansion
- ontology expansion
- runtime rewrite
- state machine rewrite
- reducer redesign
- recommendation mutation
- execution mutation
- AI behavior mutation
- trading logic mutation
- policy semantic mutation

`runtime-freeze-v1` remains maintained.
