import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetPurposeIntentAnchoringMonitorForTest(): void {
  /* stateless */
}

export function scorePurposeIntentAnchoring(input: RuntimePurposeIntegrityObserveInput): number {
  const utility = (input.continuityScore / 100) * 0.35 + input.objectiveAlignmentScore * 0.35;
  const stability =
    input.runtimeHomeostasisScore * 0.15 + input.survivabilityEffectiveness * 0.15;
  return Math.round(Math.max(0, Math.min(1, utility - stability * 0.4 + 0.5)) * 1000) / 1000;
}
