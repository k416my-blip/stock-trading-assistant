import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetDashboardSaturationScorerForTest(): void {
  /* stateless */
}

export function scoreDashboardSaturationRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  return Math.round(Math.min(1, input.dashboardRowCount / 56) * 1000) / 1000;
}
