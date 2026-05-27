import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

const anomalySamples: number[] = [];

export function resetRuntimeAnomalyClusteringForTest(): void {
  anomalySamples.length = 0;
}

export function noteAnomalySample(input: CausalIntelligenceObserveInput): void {
  const score =
    (input.eventLoopLagMs > 300 ? 1 : 0) +
    (input.renderStormRisk > 0.5 ? 1 : 0) +
    (input.reconnectPerMin > 4 ? 1 : 0) +
    (input.miuiAggressiveReclaim ? 1 : 0);
  anomalySamples.push(score);
  if (anomalySamples.length > 64) anomalySamples.shift();
}

export function scoreAnomalyCluster(): number {
  if (anomalySamples.length < 3) return 0;
  const recent = anomalySamples.slice(-12);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance =
    recent.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, recent.length - 1);
  return Math.round(Math.min(1, avg / 4 + variance / 8) * 1000) / 1000;
}
