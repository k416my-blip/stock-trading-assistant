import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetCoherenceOverfittingMonitorForTest(): void {
  /* stateless */
}

export function scoreCoherenceOverfitting(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.runtimeStrategicCoherence > 0.78 && input.layerConflictRisk > 0.38) risk += 0.28;
  if (input.runtimeCalmnessIndex > 0.78 && input.runtimeEntropyScore > 0.4) risk += 0.24;
  if (input.equilibriumPersistence > 0.75 && input.staleHydrationRisk > 0.35) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
