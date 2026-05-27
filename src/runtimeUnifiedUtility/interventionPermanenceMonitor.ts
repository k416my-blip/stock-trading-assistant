import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetInterventionPermanenceMonitorForTest(): void {
  /* stateless */
}

export function scoreInterventionPermanence(input: RuntimeUnifiedUtilityObserveInput): number {
  let score = input.interventionDensity;
  if (input.equilibriumPersistence > 0.75 && input.interventionDensity > 0.3) score += 0.2;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
