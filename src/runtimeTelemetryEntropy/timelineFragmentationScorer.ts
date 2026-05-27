import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetTimelineFragmentationScorerForTest(): void {
  /* stateless */
}

export function scoreTimelineFragmentationRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  const frag =
    Math.min(1, input.timelineEventCount / 500) * 0.55 +
    (1 - Math.min(1, input.uniqueSignalKinds / Math.max(1, input.timelineEventCount))) * 0.45;
  return Math.round(Math.min(1, frag) * 1000) / 1000;
}
