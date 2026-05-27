import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetSurvivalBiasAuditorForTest(): void {
  /* stateless */
}

export function scoreSurvivalBias(input: RuntimeUnifiedUtilityObserveInput): number {
  if (input.survivabilityEffectiveness <= 0.65) return 0.1;
  const usefulness = (input.continuityScore / 100 + input.runtimeSafeTradingScore / 100) / 2;
  return Math.round(Math.max(0, input.survivabilityEffectiveness - usefulness) * 1000) / 1000;
}
