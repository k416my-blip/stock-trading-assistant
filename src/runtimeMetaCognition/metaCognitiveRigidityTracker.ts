import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetMetaCognitiveRigidityTrackerForTest(): void {
  /* stateless */
}

export function scoreMetaCognitiveRigidityRisk(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.runtimeStrategicCoherence > 0.78 && input.simplificationIntegrity < 0.48) risk += 0.26;
  if (input.runtimeCalmnessIndex > 0.78 && input.metaRecursionRisk > 0.4) risk += 0.22;
  if (input.runtimeWorldviewLockRisk > 0.35 && input.runtimeEquilibriumHallucinationRisk > 0.35) {
    risk += 0.2;
  }
  if (input.equilibriumPersistence > 0.75 && input.runtimeEpistemologyInflationRisk > 0.35) {
    risk += 0.18;
  }
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
