import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetRecursiveCoherenceFixationDetectorForTest(): void {
  /* stateless */
}

export function scoreRecursiveCoherenceFixation(input: RuntimeEpistemicIntegrityObserveInput): number {
  let fixation = 0;
  if (input.runtimeStrategicCoherence > 0.75 && input.layerConflictRisk > 0.35) fixation += 0.25;
  if (input.equilibriumPersistence > 0.78 && input.metaRecursionRisk > 0.42) fixation += 0.22;
  if (input.crossLayerEcologyIntegrity > 0.72 && input.runtimeUtilityMonocultureRisk > 0.35) {
    fixation += 0.2;
  }
  return Math.round(Math.min(1, fixation) * 1000) / 1000;
}
