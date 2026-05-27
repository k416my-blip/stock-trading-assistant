import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetEquilibriumDependencyLockDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeEquilibriumDependencyRisk(
  input: RuntimeAgencyIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.equilibriumPersistence > 0.78 && input.interventionDensity < 0.2) risk += 0.28;
  if (input.runtimeCalmnessIndex > 0.78 && input.eventLoopLagMs > 260) risk += 0.25;
  if (input.runtimeEquilibriumHallucinationRisk > 0.35) risk += 0.22;
  if (input.runtimeEquilibriumStability > 0.78 && input.continuityScore < 76) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
