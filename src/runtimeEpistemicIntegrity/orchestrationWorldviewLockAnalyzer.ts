import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetOrchestrationWorldviewLockAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRuntimeWorldviewLockRisk(input: RuntimeEpistemicIntegrityObserveInput): number {
  let risk = input.runtimeOrchestrationCivilizationRisk * 0.35;
  if (input.orchestrationEdgeCount > 18 && input.metaCoordinationStability > 0.72) risk += 0.25;
  if (input.objectiveAlignmentScore < 0.58 && input.orchestrationEdgeCount > 14) risk += 0.2;
  if (input.layerConflictRisk > 0.35 && input.runtimeStrategicCoherence > 0.72) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
