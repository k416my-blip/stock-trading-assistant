# Runtime Risk Governance & Survivability-Aware Trading Safety

Runtime risk control layer — adjusts pacing/confidence/exposure only. Not a recommendation engine. No trading logic, policy, AI/LLM, or price prediction changes.

## Location

- Types: `src/types/tradingSafetyGovernance.ts`
- Constants: `src/constants/tradingSafetyGovernance.ts`
- Modules: `src/tradingSafetyGovernance/` (20 modules + coordinator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Trading Safety Governance**
- Soak scenario: `trading_safety_governance` (16 total scenarios)
- Verify: `npm run verify:trading-safety-governance`

## Flows (A–F)

| Flow | Purpose |
|------|---------|
| A. Runtime risk | health → confidence scaler → recommendation pacing → execution pacing |
| B. Instability degradation | bridge/memory/thermal/ws → confidence step-down |
| C. Emergency lightweight | critical runtime → minimal trading surface |
| D. Execution pacing | refresh/ws/notify/recommendation frequency |
| E. Long-session fatigue | 120min+ pacing + observer suppression |
| F. Continuity protection | hydration/recovery → execution limits |

## Exports

- Trading safety timeline
- Runtime confidence evolution
- Execution pacing report
- Survivability-weighted risk report
- Runtime suppression history
- Trading equilibrium evolution
