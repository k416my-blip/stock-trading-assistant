import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetStabilityIdeologyAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRuntimeStabilityIdeologyRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  let risk = 0;
  if (input.runtimeCalmnessIndex > 0.78 && input.interventionDensity < 0.18) risk += 0.25;
  if (input.equilibriumPersistence > 0.78 && input.eventLoopLagMs > 260) risk += 0.22;
  if (input.runtimeLeanStability > 0.78 && input.objectiveAlignmentScore < 0.58) risk += 0.2;
  if (input.runtimeEquilibriumStability > 0.78 && input.continuityScore < 78) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
