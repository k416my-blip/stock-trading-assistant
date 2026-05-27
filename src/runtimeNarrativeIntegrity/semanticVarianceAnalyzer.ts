import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetSemanticVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeSemanticVariance(input: RuntimeNarrativeIntegrityObserveInput): number {
  const layers = [
    input.runtimeStrategicCoherence,
    input.runtimeRealityIntegrityScore,
    input.runtimePurposeIntegrityScore,
    input.runtimeMetaCognitionScore,
  ];
  const mean = layers.reduce((a, b) => a + b, 0) / layers.length;
  return Math.round(Math.max(0, 1 - Math.abs(mean - 0.5) * 2) * 1000) / 1000;
}
