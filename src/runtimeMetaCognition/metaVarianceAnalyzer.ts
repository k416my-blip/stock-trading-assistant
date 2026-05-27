import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetMetaVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeMetaVariance(input: RuntimeMetaCognitionObserveInput): number {
  const layers = [
    input.runtimeStrategicCoherence,
    input.runtimeRealityIntegrityScore,
    input.runtimeAgencyIntegrityScore,
    input.runtimePurposeIntegrityScore,
  ];
  const mean = layers.reduce((a, b) => a + b, 0) / layers.length;
  return Math.round(Math.max(0, 1 - Math.abs(mean - 0.5) * 2) * 1000) / 1000;
}
