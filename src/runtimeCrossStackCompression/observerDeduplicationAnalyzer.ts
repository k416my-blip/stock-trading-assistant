import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';

export function resetObserverDeduplicationAnalyzerForTest(): void {
  /* stateless */
}

export function scoreObserverDedupRatio(input: RuntimeCrossStackCompressionObserveInput): number {
  return Math.round(Math.min(1, input.observerOverheadRatio * 0.6) * 1000) / 1000;
}
