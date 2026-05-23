import type { BridgeCongestionSnapshot } from '../../types/nativeDeviceTelemetry';
import { observeAnrRisk } from '../runtime/anrPreventionLayer';
import { getLastNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';
import { getNativeBoundaryHistograms } from '../runtime/nativeBoundaryHistograms';

let lastBridgeFetchMs = 0;

export function resetBridgeCongestionMonitorForTest(): void {
  lastBridgeFetchMs = 0;
}

export function noteBridgeFetchDurationMs(ms: number): void {
  lastBridgeFetchMs = ms;
}

export function observeBridgeCongestion(): BridgeCongestionSnapshot {
  const anr = observeAnrRisk();
  const native = getLastNativeRuntimeSnapshot();
  const hist = getNativeBoundaryHistograms();
  const bridgeBuckets = hist.bridgeFetchMs;
  const recentPressure = bridgeBuckets.reduce((s: number, b: { count: number }) => s + b.count, 0);
  const bridgeQueuePressure = Math.min(
    100,
    Math.round((native?.bridgePendingEstimate ?? 0) + anr.bridgeCongestionScore + recentPressure * 2),
  );
  return {
    bridgeQueuePressure,
    lastBridgeFetchMs,
    congestionScore: anr.bridgeCongestionScore,
  };
}
