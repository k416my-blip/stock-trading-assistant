import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetTelemetryCompressionCoordinatorForTest(): void {
  /* stateless */
}

export function scoreTelemetryAmplificationCost(input: ComplexityCompressionObserveInput): number {
  let cost = input.telemetryAmplificationScore * 0.45;
  cost += input.observerOverheadRatio * 0.25;
  cost += input.bridgeTrafficRate / 40;
  cost += input.runtimeAuditCoverage > 0.8 ? 0.08 : 0;
  return Math.round(Math.min(1, cost) * 1000) / 1000;
}

export function buildTelemetryAmplificationHeatmap(
  input: ComplexityCompressionObserveInput,
): Record<string, number> {
  return {
    bridge: Math.round(Math.min(1, input.bridgeTrafficRate / 20) * 1000) / 1000,
    observer: Math.round(input.observerOverheadRatio * 1000) / 1000,
    meta: Math.round(input.telemetryAmplificationScore * 1000) / 1000,
    audit: Math.round(input.runtimeAuditCoverage * 1000) / 1000,
    hydration: Math.round(input.hydrationOverlapCount / 5 * 1000) / 1000,
  };
}
