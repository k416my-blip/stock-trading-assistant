import type { CompressionGraphSnapshot, ComplexityCompressionObserveInput } from '../types/complexityCompression';
import { REDUNDANCY_CATEGORIES } from '../constants/complexityCompression';

export function resetObserverDeduplicationEngineForTest(): void {
  /* stateless */
}

export function scoreObserverRedundancyRisk(input: ComplexityCompressionObserveInput): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.45 && input.observerDensityScore > 0.5) risk += 0.25;
  if (input.wsDuplicateCount > 2) risk += 0.2;
  if (input.observerCountEstimate > 25) risk += 0.2;
  if (input.telemetryAmplificationScore > 0.4) risk += 0.15;
  if (input.bridgeTrafficRate > 8) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function detectRedundantObservers(input: ComplexityCompressionObserveInput): string[] {
  const dupes: string[] = [];
  if (input.observerOverheadRatio > 0.4) dupes.push('observer');
  if (input.telemetryAmplificationScore > 0.35) dupes.push('telemetry');
  if (input.recoveryChainLength > 4) dupes.push('recovery');
  if (input.pacingLayerCount > 6) dupes.push('pacing');
  if (input.orchestrationEdgeCount > 16) dupes.push('graph_tracing');
  if (input.wsDuplicateCount > 1 || input.reconnectPerMin > 5) dupes.push('websocket_observer');
  return dupes.filter((d) => REDUNDANCY_CATEGORIES.includes(d as (typeof REDUNDANCY_CATEGORIES)[number]));
}

export function buildObserverRedundancyGraph(input: ComplexityCompressionObserveInput): CompressionGraphSnapshot {
  const dupes = detectRedundantObservers(input);
  return {
    nodes: dupes.map((d) => ({ id: d, label: d, score: scoreObserverRedundancyRisk(input) })),
    edges: dupes.map((d, i) => ({
      from: d,
      to: dupes[(i + 1) % Math.max(1, dupes.length)] ?? d,
      weight: 0.35,
    })),
    measuredAt: new Date().toISOString(),
  };
}
