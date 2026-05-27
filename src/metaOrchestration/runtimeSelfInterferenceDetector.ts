import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

export function resetRuntimeSelfInterferenceDetectorForTest(): void {
  /* stateless */
}

export function detectSelfInterference(input: MetaOrchestrationObserveInput): string[] {
  const patterns: string[] = [];
  if (input.observerOverheadRatio > 0.5 && input.recoverySuccessRate < 0.75) {
    patterns.push('observer_recovery_loop');
  }
  if (input.governanceMode !== 'full_observe' && input.observerOverheadRatio > 0.55) {
    patterns.push('governance_observer_loop');
  }
  if (input.hydrationOverlapCount > 1 && input.governanceMode === 'recovery_paced') {
    patterns.push('hydration_recovery_conflict');
  }
  if (input.causalConfidence > 0.75 && input.observerOverheadRatio > 0.6) {
    patterns.push('causal_observer_burden');
  }
  return patterns;
}

export function scoreSelfInterference(input: MetaOrchestrationObserveInput): number {
  return Math.round(Math.min(1, detectSelfInterference(input).length * 0.22) * 1000) / 1000;
}
