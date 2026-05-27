import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';
import { scoreMetricCascadeRisk } from './metricCascadeScorer';

export function resetSignalEntropyScorerForTest(): void {
  /* stateless */
}

export function scoreSignalEntropy(input: RuntimeTelemetryEntropyObserveInput): number {
  const diversity = Math.min(1, input.uniqueSignalKinds / 24);
  const duplication = input.duplicateSignalRatio;
  const cascade = scoreMetricCascadeRisk(input);
  return Math.round(Math.min(1, duplication * 0.4 + (1 - diversity) * 0.35 + cascade * 0.25) * 1000) / 1000;
}
