import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetInterpretationPersistenceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeInterpretationPersistence(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.observerConfirmationLoopRisk * 0.45 + input.recursiveBeliefReinforcementRisk * 0.35 + input.governanceConfidence * 0.2) *
      1000,
  ) / 1000;
}
