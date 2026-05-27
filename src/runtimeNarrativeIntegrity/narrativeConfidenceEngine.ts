import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetNarrativeConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeNarrativeConfidence(input: RuntimeNarrativeIntegrityObserveInput): number {
  const confidence =
    (input.runtimeMetaCognitionConfidence +
      input.runtimeEpistemicConfidence +
      crossLayerSemanticProxy(input) +
      (1 - recursiveNarrativeInflationProxy(input))) /
    4;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}

function crossLayerSemanticProxy(input: RuntimeNarrativeIntegrityObserveInput): number {
  return input.crossLayerSelfConsistency * 0.5 + input.crossLayerEpistemicConsistency * 0.5;
}

function recursiveNarrativeInflationProxy(input: RuntimeNarrativeIntegrityObserveInput): number {
  return input.runtimeAuditCoverage * 0.4 + input.recursiveBeliefReinforcementRisk * 0.35 + input.observerConfirmationLoopRisk * 0.25;
}
