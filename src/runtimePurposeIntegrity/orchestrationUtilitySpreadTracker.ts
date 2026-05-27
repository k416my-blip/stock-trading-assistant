import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetOrchestrationUtilitySpreadTrackerForTest(): void {
  /* stateless */
}

export function scoreOrchestrationUtilitySpread(input: RuntimePurposeIntegrityObserveInput): number {
  const orchestrationLoad = Math.min(1, input.orchestrationEdgeCount / 28);
  const utility = (input.continuityScore / 100 + input.survivabilityEffectiveness) / 2;
  return Math.round(Math.abs(orchestrationLoad - utility) * 1000) / 1000;
}
