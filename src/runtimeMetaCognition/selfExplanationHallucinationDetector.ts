import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetSelfExplanationHallucinationDetectorForTest(): void {
  /* stateless */
}

export function scoreSelfExplanationHallucination(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.runtimeStrategicCoherence > 0.78 && input.runtimeRealityDistortionRisk > 0.38) risk += 0.3;
  if (input.runtimeEpistemologyInflationRisk > 0.38 && input.governanceConfidence > 0.75) risk += 0.25;
  if (input.runtimeEquilibriumHallucinationRisk > 0.35) risk += 0.22;
  if (input.observerConfirmationLoopRisk > 0.4) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
