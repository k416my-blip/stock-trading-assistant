import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeEntropyCompressionForTest(): void {
  /* stateless */
}

export function scoreRuntimeEntropyCompressionRate(input: ComplexityCompressionObserveInput): number {
  const before = input.runtimeEntropyScore;
  const smoothed = before * (1 - input.loadSheddingSeverity * 0.3);
  if (before <= 0) return 0;
  return Math.round(Math.max(0, Math.min(1, (before - smoothed) / before)) * 1000) / 1000;
}
