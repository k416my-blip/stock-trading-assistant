import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRecoveryDeduplicationEngineForTest(): void {
  /* stateless */
}

export function scoreRecoveryDuplication(input: ComplexityCompressionObserveInput): number {
  if (input.recoveryChainLength <= 1) return 0;
  const excess = Math.max(0, input.recoveryChainLength - 2);
  return Math.round(Math.min(1, excess / 6) * 1000) / 1000;
}

export function suggestRecoveryMerge(input: ComplexityCompressionObserveInput): string[] {
  const merges: string[] = [];
  if (input.recoveryChainLength > 4) merges.push('failure_recovery');
  if (input.recoverySuccessRate > 0.7 && input.continuityScore < 75) merges.push('continuity_recovery');
  if (input.reconnectPerMin > 4) merges.push('websocket_recovery');
  return merges;
}
