# Native Device Telemetry & Android Diagnostics (Redmi Note 13 Pro 5G)

**No new runtime layers.** Observation-only telemetry for real-device signals CI cannot see.

## CI

```bash
npm run verify:native-telemetry
```

## Components (20)

| # | Module | Role |
|---|--------|------|
| 1 | `runtimeTelemetryCollector.ts` | Orchestrates observe cycle |
| 2 | `jsThreadStallMonitor.ts` | Event-loop stall / ANR signals |
| 3 | `hermesGcMetrics.ts` | Heap-drop GC rate (heuristic) |
| 4 | `nativeHeapSampler.ts` | Android native + Java heap |
| 5 | `frameDropDetector.ts` | JS + native dropped frames |
| 6 | `reactRenderStormDetector.ts` | Render burst / storm |
| 7 | `bridgeCongestionMonitor.ts` | Bridge fetch latency pressure |
| 8 | `websocketReconnectTelemetry.ts` | WS reconnect loop |
| 9 | `batteryDrainTracker.ts` | Level + Δ%/hour |
| 10 | `thermalStateTracker.ts` | Thermal duration |
| 11 | `backgroundKillDetector.ts` | Trim / MIUI kill risk |
| 12 | `appResumeRecoveryMetrics.ts` | Resume + fg/bg oscillation |
| 13 | `asyncQueueProfiler.ts` | Queue depth saturation |
| 14 | `dashboardRenderProfiler.ts` | Dashboard commit + FPS |
| 15 | `replayGrowthTelemetry.ts` | Replay count / min |
| 16 | `heapLeakTrendAnalyzer.ts` | Heap slope leak hint |
| 17 | `tickDurationHistogram.ts` | Tick avg / max / p95 |
| 18 | `runtimeFpsTracker.ts` | FPS stability |
| 19 | `memorySnapshotExporter.ts` | Rolling memory snapshots |
| 20 | `nativePerformanceDashboard.ts` | Dashboard bundle builder |

## Redmi on-device check

1. Release/dev build on **Redmi Note 13 Pro 5G**, Paper Trading, open **Runtime Stability**.
2. Confirm **Native Telemetry** section updates every ~2s foreground.
3. Background app → sampling slows (~15s); profilers minimal.
4. Heat device (gaming/camera) → `samplingMode: paused`, thermal duration increases.
5. Export: DevTools / `formatNativeDeviceTelemetryExportJson()` from debugger.

## Allowed changes during this phase

Observation and dashboard only. Do not add runtime layers or change tick policy via telemetry.
