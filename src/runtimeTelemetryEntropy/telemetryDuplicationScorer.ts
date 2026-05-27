import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetTelemetryDuplicationScorerForTest(): void {
  /* stateless */
}

export function scoreTelemetryDuplicationRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  const dup =
    input.duplicateSignalRatio * 0.5 +
    Math.min(1, input.telemetrySampleCount / 150) * 0.3 +
    input.observerOverheadRatio * 0.2;
  return Math.round(Math.min(1, dup) * 1000) / 1000;
}
