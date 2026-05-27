# Runtime Provider Pressure Reduction

Freeze tag: `runtime-freeze-v1`

This phase reduces AppContext and ProactiveConciergeContext render pressure through readonly derived selectors and memoized computed slices only. Provider state machines, reducers, runtime orchestration, recommendation, execution, AI reasoning, trading logic, policy semantics, and runtime semantics remain unchanged.

## Provider Pressure Audit

Audited files:

- `src/context/AppContext.tsx`
- `src/context/ProactiveConciergeContext.tsx`
- `src/components/AiAssistantChat.tsx`
- `src/hooks/useConciergeDashboardSlices.ts`
- `src/components/concierge/RuntimeStabilityDashboardPanel.tsx`

Findings:

- `AIAssistantChat` still needed proactive suggestions, actions, and AI runtime flags but did not need the full concierge context object.
- proactive suggestion filtering and UX summary mapping were repeated in chat render paths.
- dashboard bundle hooks read from the broad concierge context before extracting individual bundle fields.
- AppContext had narrow AI and proactive selectors, but no derived AI runtime flags or readonly runtime metrics slice.

## Readonly Derived Selectors

Added:

- `useAppAiChatDerivedSelector`
- `useAppReadonlyRuntimeMetricsSelector`
- `useProactiveConciergeChatSelector`
- `useProactiveConciergeDashboardSelector`

These hooks expose readonly computed slices. They do not mutate state and do not alter provider behavior.

## Subscription Isolation

Implemented:

- AI chat scoped selector for proactive suggestions and actions.
- Dashboard scoped selector for runtime dashboard bundle reads.
- Readonly proactive computed fields:
  - `unhandledSuggestions`
  - `uxSuggestionSummaries`
- Readonly AppContext computed flags:
  - `hasAiApiKey`
  - `conciergeUxMode`
  - `runtimeDashboardEnabled`
  - `voiceEnabled`
  - `voiceAutoRead`

## Derived Computation Memoization

Moved repeated derived work into memoized readonly slices:

- unhandled proactive suggestion filtering
- proactive UX summary mapping
- AI chat runtime flags
- dashboard bundle slice access

## Diagnostics

Added `src/tooling/runtimeProviderPressureReductionReport.ts` and package script:

- `npm run report:provider-pressure-reduction`

Report outputs:

- provider pressure metrics
- selector fanout report
- rerender hotspot diagnostics
- derived computation metrics

Metrics:

- `providerPressureReductionScore`
- `selectorIsolationScore`
- `rerenderReductionScore`
- `derivedComputationReductionScore`
- `subscriptionStabilityScore`

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
- runtime semantics

`runtime-freeze-v1` remains maintained.
