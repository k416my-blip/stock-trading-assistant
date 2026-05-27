# Runtime Causal Intelligence & Failure Attribution Graph

Deterministic causal attribution — statistics, time-series correlation, and dependency analysis only. No AI/LLM inference, no runtime policy changes.

## Location

- Types: `src/types/runtimeCausalIntelligence.ts`
- Constants: `src/constants/runtimeCausalIntelligence.ts`
- Modules: `src/causalIntelligence/` (20 modules + coordinator + orchestrator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Causal Intelligence**
- Soak scenario: `causal_intelligence` (14 total scenarios)
- Verify: `npm run verify:causal-intelligence`

## Flows (A–E)

| Flow | Purpose |
|------|---------|
| A. Causal reconstruction | Timeline correlate → dependency edges → chain |
| B. Failure attribution | Triggers → merge factors → weighted root causes |
| C. Recovery attribution | Recovery success → trace actions → contribution |
| D. Cascade analysis | frame lag → bridge → websocket → governance → thermal |
| E. Long-session drift | Early vs late session degradation source shift |

## Exports

- Causal timeline
- Incident graph
- Recovery attribution report
- Degradation propagation map
- Survivability causality evolution
