import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetResourceVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeResourceVariance(input: RuntimeResourceStabilityObserveInput): number {
  const values = [input.jsHeapMb / 200, input.eventLoopLagMs / 500, input.renderStormRisk];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length * 1000) / 1000;
}
