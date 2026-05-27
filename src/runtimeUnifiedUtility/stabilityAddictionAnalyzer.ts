import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetStabilityAddictionAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRuntimeStabilityAddictionRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  let risk = 0;
  if (input.runtimeCalmnessIndex > 0.75 && input.interventionDensity < 0.2) risk += 0.25;
  if (input.equilibriumPersistence > 0.78) risk += 0.22;
  if (input.runtimeLeanStability > 0.78 && input.eventLoopLagMs > 250) risk += 0.18;
  if (input.runtimeHomeostasisScore > 0.75 && input.objectiveAlignmentScore < 0.6) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
