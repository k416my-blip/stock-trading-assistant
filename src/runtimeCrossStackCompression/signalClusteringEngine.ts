import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';

export function resetSignalClusteringEngineForTest(): void {
  /* stateless */
}

export function scoreClusteredSignals(input: RuntimeCrossStackCompressionObserveInput): number {
  return Math.round(input.rawSignalCount * 0.42 * 1000) / 1000;
}
