import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetCoherenceMythologyDetectorForTest(): void {
  /* stateless */
}

export function detectCoherenceMythology(input: RuntimeNarrativeIntegrityObserveInput): number {
  let risk = 0;
  if (input.runtimeStrategicCoherence > 0.75 && input.runtimeRealityDistortionRisk > 0.35) risk += 0.35;
  if (input.runtimeStabilityIdeologyRisk > 0.35) risk += 0.25;
  if (input.runtimeEquilibriumHallucinationRisk > 0.35) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
