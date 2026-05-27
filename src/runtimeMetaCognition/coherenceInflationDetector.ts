import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetCoherenceInflationDetectorForTest(): void {
  /* stateless */
}

export function detectCoherenceInflation(input: RuntimeMetaCognitionObserveInput): number {
  let inflation = 0;
  if (input.runtimeStrategicCoherence > 0.75 && input.runtimeRealityDistortionRisk > 0.35) inflation += 0.35;
  if (input.runtimeCalmnessIndex > 0.75 && input.observerConfirmationLoopRisk > 0.35) inflation += 0.3;
  if (input.equilibriumPersistence > 0.72) inflation += 0.2;
  return Math.round(Math.min(1, inflation) * 1000) / 1000;
}
