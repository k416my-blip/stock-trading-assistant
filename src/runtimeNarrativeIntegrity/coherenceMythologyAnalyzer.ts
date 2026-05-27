import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetCoherenceMythologyAnalyzerForTest(): void {
  /* stateless */
}

export function scoreCoherenceMythologyRisk(input: RuntimeNarrativeIntegrityObserveInput): number {
  let risk = 0;
  if (input.runtimeStrategicCoherence > 0.78 && input.runtimeRealityDistortionRisk > 0.38) risk += 0.28;
  if (input.runtimeCalmnessIndex > 0.78 && input.runtimeEquilibriumHallucinationRisk > 0.35) risk += 0.24;
  if (input.runtimeStabilityIdeologyRisk > 0.38 && input.crossLayerEpistemicConsistency < 0.55) {
    risk += 0.2;
  }
  if (input.metaCognitiveRigidityRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
