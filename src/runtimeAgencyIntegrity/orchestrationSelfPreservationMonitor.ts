import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetOrchestrationSelfPreservationMonitorForTest(): void {
  /* stateless */
}

export function scoreOrchestrationSelfPreservation(input: RuntimeAgencyIntegrityObserveInput): number {
  let score = Math.min(1, input.orchestrationEdgeCount / 28) * 0.35;
  if (input.metaCoordinationStability > 0.72 && input.orchestrationEdgeCount > 14) score += 0.25;
  if (input.runtimeOrchestrationCivilizationRisk > 0.35) score += 0.2;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
