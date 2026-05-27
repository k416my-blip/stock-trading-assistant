import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { scoreRecoveryAttribution } from './recoveryRootCauseAnalyzer';

export function resetRecoveryEffectivenessCausalityForTest(): void {
  /* stateless */
}

export function estimateRecoveryContribution(input: CausalIntelligenceObserveInput): Record<string, number> {
  const total = scoreRecoveryAttribution(input) || 0.01;
  return {
    continuity: (input.continuityScore / 100) * 0.35 / total,
    hydration: (1 - input.staleHydrationRisk) * 0.2 / total,
    js_thread: (input.jsSurvivalScore / 100) * 0.25 / total,
    orchestrator: input.recoverySuccessRate * 0.2 / total,
  };
}
