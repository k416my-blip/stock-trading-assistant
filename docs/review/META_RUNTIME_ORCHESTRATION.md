# Meta Runtime Orchestrator & Stability Conflict Resolution

Meta coordination across survivability layers — conflict arbitration, oscillation suppression, and equilibrium only. No runtime policy, AI/LLM, or recommendation changes.

## Location

- Types: `src/types/metaRuntimeOrchestration.ts`
- Constants: `src/constants/metaRuntimeOrchestration.ts`
- Modules: `src/metaOrchestration/` (20 modules + coordinator + orchestrator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Meta Orchestration**
- Soak scenario: `meta_orchestration` (15 total scenarios)
- Verify: `npm run verify:meta-orchestration`

## Flows (A–F)

| Flow | Purpose |
|------|---------|
| A. Conflict arbitration | recovery vs governance vs continuity vs telemetry |
| B. Oscillation suppression | degraded ↔ healthy with hysteresis + cooldown |
| C. Telemetry amplification protection | break observer→overhead→recovery loops |
| D. Runtime equilibrium | balance intervention density across layers |
| E. Long-session fatigue | 120min+ orchestration pacing |
| F. Cross-layer pacing | minimal-interference execution order |

## Exports

- Orchestration timeline
- Survivability conflict report
- Equilibrium evolution
- Pacing graph
- Intervention heatmap
- Runtime fatigue evolution
