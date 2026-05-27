# Runtime Hydration Segmentation

Freeze tag: `runtime-freeze-v1`

This phase reduces React Native UI hydration pressure and initial dashboard/chat render cost through deferred render activation and readonly render segmentation only. Recommendation, execution, AI reasoning, trading logic, policy semantics, runtime orchestration, provider state machines, reducers, navigation, and runtime semantics remain unchanged.

## Hydration Audit

Audited targets:

- `src/components/concierge/RuntimeStabilityDashboardPanel.tsx`
- `src/components/AiAssistantChat.tsx`
- `src/screens/AiSettingsScreen.tsx`
- `src/components/concierge/CapitalAllocationPanel.tsx`
- `src/components/concierge/PortfolioRiskExposurePanel.tsx`

Observed pressure:

- runtime dashboard queried many dashboard getters synchronously during cold render
- concierge chat mounted suggestion cards and many lazy dashboard panels in the first render burst
- AI settings rendered a long sequence of advanced layer toggles immediately
- capital and portfolio risk panels computed and mounted detailed analytics lists immediately

## Deferred Render Activation

Added `src/hooks/useDeferredRenderActivation.ts` using interaction-based activation via `InteractionManager.runAfterInteractions` plus bounded delay windows.

Implemented staged activation:

- dashboard analytics hydration after initial health rows
- archive dashboard hydration after lightweight dashboard rows
- chat suggestion rendering after initial thread/composer hydration
- concierge analytics panel rendering after chat shell hydration
- AI settings advanced layer toggles after core API/safety settings
- capital/risk detail analytics after summary controls

## Render Segmentation

Implemented readonly render boundaries:

- core runtime health rows remain immediate
- runtime analytics/archive sections are delayed
- chat composer/thread remain immediate
- concierge analytics panels are delayed
- settings core controls remain immediate
- panel detail lists are delayed behind summary rows

## Diagnostics

Added `src/tooling/runtimeHydrationSegmentationReport.ts` and package script:

- `npm run report:hydration-segmentation`

Report outputs:

- hydration pressure report
- cold render metrics
- deferred activation metrics
- initial mount diagnostics

Metrics:

- `hydrationReductionScore`
- `coldStartReductionScore`
- `initialRenderPressureReduction`
- `deferredActivationEffectiveness`
- `renderBurstReductionScore`

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
