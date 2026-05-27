import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetOrchestrationCivilizationTrackerForTest(): void {
  /* stateless */
}

export function scoreRuntimeOrchestrationCivilizationRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  let risk = Math.min(1, input.orchestrationEdgeCount / 28) * 0.35;
  if (input.metaCoordinationStability > 0.72 && input.orchestrationEdgeCount > 16) risk += 0.25;
  if (input.interventionDensity > 0.42 && input.orchestrationEdgeCount > 14) risk += 0.2;
  if (input.sessionMinutes > 90 && input.orchestrationEdgeCount > 18) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
