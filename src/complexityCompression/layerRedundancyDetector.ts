import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetLayerRedundancyDetectorForTest(): void {
  /* stateless */
}

export function detectLayerRedundancy(input: ComplexityCompressionObserveInput): string[] {
  const redundant: string[] = [];
  if (input.pacingLayerCount > 5 && input.loadSheddingSeverity > 0.3) redundant.push('pacing_overlap');
  if (input.recoveryChainLength > 3 && input.recoverySuccessRate > 0.7) redundant.push('recovery_overlap');
  if (input.observerCountEstimate > 20 && input.observerOverheadRatio > 0.35) redundant.push('observer_overlap');
  if (input.telemetryAmplificationScore > 0.35 && input.runtimeAuditCoverage > 0.7) redundant.push('telemetry_overlap');
  return redundant;
}

export function scoreLayerRedundancyDensity(input: ComplexityCompressionObserveInput): number {
  return Math.round((detectLayerRedundancy(input).length / 4) * 1000) / 1000;
}
