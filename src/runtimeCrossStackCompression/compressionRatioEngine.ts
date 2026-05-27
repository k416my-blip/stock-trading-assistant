import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';
import { scoreTelemetryDedupRatio } from './telemetryDeduplicator';
import { scoreObserverDedupRatio } from './observerDeduplicationAnalyzer';

export function resetCompressionRatioEngineForTest(): void {
  /* stateless */
}

export function scoreSignalCompressionRatio(input: RuntimeCrossStackCompressionObserveInput): number {
  return Math.round(
    ((scoreTelemetryDedupRatio(input) + scoreObserverDedupRatio(input) + input.runtimeCompressionEfficiency) / 3) *
      1000,
  ) / 1000;
}

export function scoreCrossStackCompression(input: RuntimeCrossStackCompressionObserveInput): number {
  return Math.round(
    (input.runtimeNarrativeIntegrityScore * 0.2 +
      input.runtimeMetaCognitionScore * 0.2 +
      input.runtimeAgencyIntegrityScore * 0.2 +
      input.runtimeEpistemicConfidence * 0.2 +
      scoreSignalCompressionRatio(input) * 0.2) *
      1000,
  ) / 1000;
}
