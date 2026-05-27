# Runtime Adaptive Governor

Freeze state: `runtime-freeze-v1`

This phase adds adaptive runtime pressure diagnostics and UI hydration load shedding. It does not change recommendation logic, execution logic, AI reasoning, trading logic, policy semantics, provider semantics, reducers, or runtime orchestration semantics.

## Runtime Pressure Tiers

The governor uses `normal`, `elevated`, `high`, and `critical` tiers. The composite runtime tier is derived from readonly diagnostics:

- JS stall pressure from event loop lag and long task telemetry.
- Render burst pressure from commit spikes and render burst counters.
- Hydration pressure from deferred activation backlog, hydration blocking, and hydration collision diagnostics.
- Battery-aware runtime pressure from battery saver state.
- Offline recovery pressure from offline mode and offline queue rejection diagnostics.
- Async collision pressure from pending/duplicate async lifecycle diagnostics.
- Background resume pressure from AppState resume spike telemetry.

## Dynamic Load Shedding

`useDeferredRenderActivation` now accepts a readonly hydration priority:

- `interaction`: protected first; only minimal delay under critical pressure.
- `normal`: small adaptive delay under elevated/high/critical pressure.
- `proactive`: delayed under pressure, suppressed during critical JS/offline/hydration pressure.
- `analytics`: delayed under elevated/high pressure and suppressed during critical pressure.
- `archive`: most aggressively delayed or suppressed during critical pressure.

The governor records suppression and load-shedding diagnostics, then retries later. It does not delete UI, remove metrics, rewrite dashboards, or mutate application state.

## Covered UI Paths

- `AIAssistantChat:suggestions`: proactive suggestion throttling.
- `AIAssistantChat:dashboard`: dashboard analytics deferral.
- `RuntimeStabilityDashboardPanel:analytics`: analytics hydration throttling.
- `RuntimeStabilityDashboardPanel:archive`: archive panel suppression during critical pressure.
- `AiSettingsScreen:advanced`: AI settings delayed hydration.
- `CapitalAllocationPanel:analytics` and `PortfolioRiskExposurePanel:analytics`: analytics load shedding.

## Mobile Adaptive Policies

- Battery saver mode maps to high mobile runtime pressure and delays low-priority hydration.
- Offline mode maps to offline recovery pressure and reduces hydration demand while recovery is active.
- App foreground resume records staged recovery diagnostics.
- JS stall and render burst pressure are checked again immediately before hydration activation.

## Readonly Guarantee

The adaptive governor is a diagnostics-guided scheduler for deferred UI activation only. It does not mutate recommendation, execution, AI reasoning, trading logic, provider state machines, reducers, policy, or orchestration semantics.
