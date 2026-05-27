import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetSelfReferencePersistenceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeSelfReferencePersistence(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerOverheadRatio * 0.35 +
      input.observerConfirmationLoopRisk * 0.35 +
      input.recursiveBeliefReinforcementRisk * 0.3) *
      1000,
  ) / 1000;
}
