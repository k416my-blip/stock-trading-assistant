import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetExportPayloadScorerForTest(): void {
  /* stateless */
}

export function scoreExportPayloadRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  const kb = input.exportBytesEstimate / 1024;
  return Math.round(Math.min(1, kb / 512) * 1000) / 1000;
}
