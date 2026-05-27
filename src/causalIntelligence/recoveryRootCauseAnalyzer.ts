import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetRecoveryRootCauseAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeRecoveryRootCause(input: CausalIntelligenceObserveInput): string[] {
  const path: string[] = [];
  if (input.recoverySuccessRate > 0.7) path.push('recovery_success');
  else path.push('recovery_partial');
  if (input.continuityScore > 75) path.push('continuity_stable');
  if (input.hydrationOverlapCount > 0) path.push('hydration_recovery');
  if (input.jsSurvivalScore > 70) path.push('js_thread_survived');
  return path;
}

export function scoreRecoveryAttribution(input: CausalIntelligenceObserveInput): number {
  let score = input.recoverySuccessRate * 0.5;
  score += (input.continuityScore / 100) * 0.25;
  score += (input.jsSurvivalScore / 100) * 0.15;
  score += (1 - input.staleHydrationRisk) * 0.1;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
