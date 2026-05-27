import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetEquilibriumHallucinationDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeEquilibriumHallucinationRisk(
  input: RuntimeEpistemicIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.runtimeCalmnessIndex > 0.78 && input.eventLoopLagMs > 260) risk += 0.28;
  if (input.equilibriumPersistence > 0.78 && input.continuityScore < 76) risk += 0.25;
  if (input.runtimeEquilibriumStability > 0.78 && input.interventionDensity < 0.18) risk += 0.2;
  if (input.runtimeStabilityIdeologyRisk > 0.35) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
