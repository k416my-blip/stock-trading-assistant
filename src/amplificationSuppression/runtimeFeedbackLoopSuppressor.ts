import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetRuntimeFeedbackLoopSuppressorForTest(): void {
  /* stateless */
}

export function detectFeedbackLoops(input: AmplificationSuppressionObserveInput): string[] {
  const loops: string[] = [];
  if (input.observerOverheadRatio > 0.5 && input.telemetryAmplificationScore > 0.45) {
    loops.push('observer_telemetry');
  }
  if (input.telemetryAmplificationScore > 0.4 && input.recoverySuccessRate < 0.75) {
    loops.push('telemetry_recovery');
  }
  if (input.governanceMode !== 'full_observe' && input.observerOverheadRatio > 0.55) {
    loops.push('governance_observer');
  }
  return loops;
}
