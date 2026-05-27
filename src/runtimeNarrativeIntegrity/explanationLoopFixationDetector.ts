import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetExplanationLoopFixationDetectorForTest(): void {
  /* stateless */
}

export function scoreExplanationLoopFixationRisk(
  input: RuntimeNarrativeIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.runtimeAuditCoverage > 0.78 && input.recursiveAuditFixationRisk > 0.35) risk += 0.28;
  if (input.runtimeStrategicCoherence > 0.78 && input.metaCognitiveRigidityRisk > 0.35) risk += 0.24;
  if (input.observerConfirmationLoopRisk > 0.38 && input.recursiveBeliefReinforcementRisk > 0.35) {
    risk += 0.2;
  }
  if (input.equilibriumPersistence > 0.72) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
