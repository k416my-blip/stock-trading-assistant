# Runtime Complexity Compression & Autonomous Simplification

Simplification / deduplication / compression / anti-bloat layer — detects redundant observers, telemetry, recovery, and orchestration inflation. No policy, recommendation, AI, trading logic, or governance meaning changes.

## Location

- Types: `src/types/complexityCompression.ts`
- Constants: `src/constants/complexityCompression.ts`
- Modules: `src/complexityCompression/` (20 modules + coordinator)
- Integration: `observeNativeDeviceTelemetryFromMetrics` in `nativeRuntimeIntegration.ts`
- Dashboard: Runtime Stability → **Complexity Compression**
- Soak scenario: `complexity_compression` (19 total scenarios)
- Verify: `npm run verify:complexity-compression`

## Flows (A–J)

| Flow | Purpose |
|------|---------|
| A. Complexity analysis | observer/telemetry/pacing/intervention/recovery/orchestration counts |
| B. Redundancy detection | duplicate observer/telemetry/recovery/pacing/ws observers |
| C. Recursive stabilization | meta→recovery→governance→suppression cycle graph |
| D. Autonomous pruning | staged stop of low-value telemetry/observers/tracing |
| E. Observer value scoring | continuity/stability vs thermal/amplification cost |
| F. Runtime compression | merge pacing/ws/thermal/continuity/recovery cooldown |
| G. Noise reduction | entropy/oscillation/jitter/telemetry noise smoothing |
| H. Lean-mode orchestration | lightweight telemetry/minimal observer/continuity-only |
| I. Complexity equilibrium | survivability vs continuity vs thermal vs cost balance |
| J. Long-session simplification | 120min+ observer/orchestration/telemetry inflation compression |

## Exports

- Complexity analysis report
- Redundancy report
- Recursion analysis
- Observer value report
- Compression efficiency report
- Lean-mode report
- Orchestration inflation report
- Simplification equilibrium report
