import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetSemanticHallucinationPersistenceDetectorForTest(): void {
  /* stateless */
}

export function scoreSemanticHallucinationPersistence(
  input: RuntimeNarrativeIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.runtimeRealityDistortionRisk > 0.38 && input.runtimeStrategicCoherence > 0.78) risk += 0.3;
  if (input.runtimeEquilibriumHallucinationRisk > 0.38) risk += 0.25;
  if (input.runtimeEpistemologyInflationRisk > 0.38 && input.equilibriumPersistence > 0.72) {
    risk += 0.22;
  }
  if (input.observerConfirmationLoopRisk > 0.4) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
