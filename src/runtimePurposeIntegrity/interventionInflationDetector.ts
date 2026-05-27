import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetInterventionInflationDetectorForTest(): void {
  /* stateless */
}

export function scoreInterventionInflationRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.interventionDensity > 0.45) risk += 0.28;
  if (input.interventionDensity > 0.35 && input.survivabilityEffectiveness < 0.65) risk += 0.2;
  if (input.interventionDensity > 0.4 && input.continuityScore < 78) risk += 0.18;
  if (input.equilibriumPersistence > 0.75 && input.interventionDensity > 0.3) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
