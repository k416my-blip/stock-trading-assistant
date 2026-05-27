import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetOrchestrationPersistenceTrackerForTest(): void {
  /* stateless */
}

export function scoreOrchestrationPersistence(input: RuntimeUnifiedUtilityObserveInput): number {
  let score = Math.min(1, input.orchestrationEdgeCount / 28);
  if (input.metaCoordinationStability > 0.72) score += 0.15;
  if (input.interventionDensity > 0.4) score += 0.12;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
