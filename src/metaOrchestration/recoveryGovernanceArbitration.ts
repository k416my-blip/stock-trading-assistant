import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';
import { SURVIVABILITY_LAYER_PRIORITY } from '../constants/metaRuntimeOrchestration';

export function resetRecoveryGovernanceArbitrationForTest(): void {
  /* stateless */
}

export function arbitrateRecoveryVsGovernance(input: MetaOrchestrationObserveInput): string {
  const recoveryUrgent = input.recoverySuccessRate < 0.6;
  const governanceActive = input.governanceMode !== 'full_observe';
  if (recoveryUrgent && governanceActive) {
    return SURVIVABILITY_LAYER_PRIORITY.recovery < SURVIVABILITY_LAYER_PRIORITY.governance
      ? 'prioritize_recovery'
      : 'prioritize_governance';
  }
  if (recoveryUrgent) return 'prioritize_recovery';
  if (governanceActive) return 'defer_governance';
  return 'balanced';
}

export function arbitrationWinner(input: MetaOrchestrationObserveInput): 'recovery' | 'governance' | 'continuity' | 'balanced' {
  if (input.continuityScore < 65) return 'continuity';
  if (input.recoverySuccessRate < 0.55) return 'recovery';
  if (input.governanceMode !== 'full_observe' && input.governanceConfidence < 0.6) return 'governance';
  return 'balanced';
}
