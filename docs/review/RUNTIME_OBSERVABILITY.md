# Runtime Observability & Failure Forensics Layer

Version: `1.0.0` · Constraints: `realTradingEnabled=false`, no strategy mutation, no governance bypass.

## Purpose

Close the gap **“root cause not observable when failures occur”** via runtime/system metrics only (no prompts, PII, or stealth telemetry).

## Modules

| Module | Path | Role |
|--------|------|------|
| Event Journal | `runtimeEventJournal.ts` | Ring buffer (5000 events, 512KB cap, compact mode) |
| Timeline Engine | `timelineReconstructionEngine.ts` | `reconstructFailureTimeline()`, cascade sequence, root candidates |
| Snapshots | `runtimeSnapshotSystem.ts` | CRITICAL / rollback / starvation / event-loop / replay triggers |
| Async Starvation | `asyncStarvationAnalyzer.ts` | `STARVATION_NONE` / `WARNING` / `CRITICAL` |
| Hydration Forensics | `hydrationRaceForensics.ts` | Overlap / duplicate resume chain |
| WebSocket Analytics | `websocketFailureAnalytics.ts` | Jitter, storm, heartbeat, resume latency |
| Adaptive Forensics | `adaptiveLearningForensics.ts` | Edge evolution, rollback, false causal chain |
| Long Session | `longSessionDegradationAnalyzer.ts` | 30 / 60 / 120 min degradation windows |
| Dashboard | `runtimeObservabilityDashboard.ts` | Aggregated timeline, heatmap, maps |
| Failure Replay | `failureReplayMode.ts` | Deterministic mock scenarios |
| Safe Constraints | `safeObservabilityConstraints.ts` | Forbidden tag filtering |
| Integration | `runtimeObservabilityIntegration.ts` | Tick hooks, bundle, Redmi report |

## Integration points

- `observeRuntimeStabilityTick` → journal + long-session samples + snapshots
- `scheduleReconnect` → `websocket_reconnect` journal events
- `hydrationLock` → pause/resume journal events
- `runAdaptiveGovernance` → rollback / replay divergence / snapshot on rollback

## Verification

```bash
npm run verify:observability
```

## Redmi Note 13 Pro 5G report

`buildRedmiNote13ProObservabilityReport(bundle)` scores:

- forensic reconstruction quality
- async starvation detectability
- reconnect failure observability
- long-session trace stability
- memory overhead (KB)
- snapshot frequency
- compression efficiency
- replay determinism quality
