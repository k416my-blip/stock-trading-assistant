import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetSurvivabilityUsefulnessDivergenceTrackerForTest(): void {
  /* stateless */
}

export function scoreSurvivabilityUtilitySpread(input: RuntimePurposeIntegrityObserveInput): number {
  const usefulness =
    (input.continuityScore / 100) * 0.35 +
    (1 - Math.min(1, input.eventLoopLagMs / 500)) * 0.35 +
    (input.runtimeSafeTradingScore / 100) * 0.3;
  return Math.round(Math.abs(input.survivabilityEffectiveness - usefulness) * 1000) / 1000;
}

export function scoreRuntimeUsefulnessDivergenceRisk(input: RuntimePurposeIntegrityObserveInput): number {
  const spread = scoreSurvivabilityUtilitySpread(input);
  let risk = spread;
  if (input.survivabilityEffectiveness > 0.65 && input.continuityScore < 72) risk += 0.2;
  if (input.survivabilityEffectiveness > 0.6 && input.eventLoopLagMs > 300) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
