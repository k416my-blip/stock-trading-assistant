import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetRuntimeOrchestrationHollowingDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeHollowingRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.orchestrationEdgeCount > 16 && input.continuityScore < 78) risk += 0.25;
  if (input.interventionDensity > 0.45 && input.survivabilityEffectiveness < 0.65) risk += 0.22;
  if (input.metaCoordinationStability > 0.7 && input.objectiveAlignmentScore < 0.6) risk += 0.2;
  if (input.runtimeComplexityScore > 0.4 && input.simplificationIntegrity < 0.55) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
