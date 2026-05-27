import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetCrossLayerMergeCoordinatorForTest(): void {
  /* stateless */
}

export function planCrossLayerMerges(input: ComplexityCompressionObserveInput): string[] {
  const merges: string[] = [];
  if (input.pacingLayerCount > 5 && input.recoveryChainLength > 3) merges.push('pacing_recovery');
  if (input.observerOverheadRatio > 0.4 && input.telemetryAmplificationScore > 0.35) merges.push('observer_telemetry');
  if (input.runtimeTradingSuppression > 0.4 && input.loadSheddingSeverity > 0.3) merges.push('suppression_shedding');
  if (input.orchestrationEdgeCount > 16) merges.push('orchestration_edges');
  return merges;
}

export function scoreMergeFeasibility(input: ComplexityCompressionObserveInput): number {
  let score = 0.6;
  if (input.continuityScore > 72) score += 0.15;
  if (input.runtimeSafeTradingScore > 60) score += 0.1;
  if (input.governanceConfidence > 0.6) score += 0.08;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
