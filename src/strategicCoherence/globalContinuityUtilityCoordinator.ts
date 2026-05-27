import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

const continuityUtilityEvolution: { at: string; utility: number }[] = [];

export function resetGlobalContinuityUtilityCoordinatorForTest(): void {
  continuityUtilityEvolution.length = 0;
}

export function scoreContinuityUtility(input: StrategicCoherenceObserveInput): number {
  let utility = (input.continuityScore / 100) * 0.35;
  utility += (input.runtimeSafeTradingScore / 100) * 0.25;
  utility += (1 - input.staleHydrationRisk) * 0.2;
  utility += input.heartbeatAgeMs < 8000 ? 0.12 : 0;
  utility += input.recoverySuccessRate * 0.08;
  const rounded = Math.round(Math.max(0, Math.min(1, utility)) * 1000) / 1000;
  continuityUtilityEvolution.push({ at: new Date().toISOString(), utility: rounded });
  if (continuityUtilityEvolution.length > 64) continuityUtilityEvolution.shift();
  return rounded;
}

export function getContinuityUtilityEvolution(): { at: string; utility: number }[] {
  return [...continuityUtilityEvolution];
}
