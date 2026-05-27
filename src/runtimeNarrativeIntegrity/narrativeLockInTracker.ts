import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetNarrativeLockInTrackerForTest(): void {
  /* stateless */
}

export function scoreRuntimeNarrativeLockRisk(input: RuntimeNarrativeIntegrityObserveInput): number {
  let risk = 0;
  if (input.runtimeWorldviewLockRisk > 0.35 && input.runtimeEquilibriumHallucinationRisk > 0.35) {
    risk += 0.28;
  }
  if (input.equilibriumPersistence > 0.78 && input.runtimeCalmnessIndex > 0.78) risk += 0.24;
  if (input.runtimeStabilityIdeologyRisk > 0.35) risk += 0.2;
  if (input.observerSelfReferenceLockRisk > 0.35) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
