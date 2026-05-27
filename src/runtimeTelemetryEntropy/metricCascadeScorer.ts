import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetMetricCascadeScorerForTest(): void {
  /* stateless */
}

export function scoreMetricCascadeRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  const cascade =
    Math.min(1, input.asyncQueueDepth / 14) * 0.35 +
    Math.min(1, input.snapshotWriteRate / 40) * 0.35 +
    Math.min(1, input.reconnectPerMin / 10) * 0.3;
  return Math.round(Math.min(1, cascade) * 1000) / 1000;
}
