import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetMetaCognitionConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeMetaCognitionConfidence(input: RuntimeMetaCognitionObserveInput): number {
  const confidence =
    (input.runtimeAgencyConfidence +
      input.runtimeEpistemicConfidence +
      crossLayerSelfConsistencyProxy(input) +
      (1 - recursiveSelfObservationRiskProxy(input))) /
    4;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}

function crossLayerSelfConsistencyProxy(input: RuntimeMetaCognitionObserveInput): number {
  return (
    input.crossLayerAgencyConsistency * 0.5 + input.crossLayerEpistemicConsistency * 0.5
  );
}

function recursiveSelfObservationRiskProxy(input: RuntimeMetaCognitionObserveInput): number {
  return input.observerDensityScore * 0.4 + input.runtimeAuditCoverage * 0.3 + input.metaRecursionRisk * 0.3;
}
