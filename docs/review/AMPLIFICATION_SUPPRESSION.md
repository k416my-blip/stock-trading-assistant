# Runtime Amplification Suppression & Autonomous Load Shedding

Self-protection layer — suppresses observer self-amplification, over-observation, recovery chains, and cascade loops. No policy, recommendation, AI, or trading logic changes.

## Location

- Types: `src/types/amplificationSuppression.ts`
- Constants: `src/constants/amplificationSuppression.ts`
- Modules: `src/amplificationSuppression/` (20 modules + coordinator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Amplification Suppression**
- Soak scenario: `amplification_suppression` (17 total scenarios)
- Verify: `npm run verify:amplification-suppression`

## Flows (A–I)

| Flow | Purpose |
|------|---------|
| A. Amplification detection | observer→telemetry→recovery→governance→meta cycle density |
| B. Observer cascade suppression | heavy observer stop, sampling down |
| C. Recovery amplification guard | recovery loop cooldown/defer |
| D. Autonomous load shedding | staged analytics→concierge→telemetry→tracing→soak stop |
| E. Thermal amplification | thermal+density joint suppression |
| F. Websocket storm | exponential reconnect pacing |
| G. Background starvation | MIUI reclaim shedding |
| H. Entropy stabilization | high entropy → pacing lock |
| I. Stabilization equilibrium | survivability vs overhead balance |

## Exports

- Amplification incident report
- Observer suppression history
- Runtime entropy evolution
- Load shedding history
- Stabilization equilibrium report
- Recursion suppression report
