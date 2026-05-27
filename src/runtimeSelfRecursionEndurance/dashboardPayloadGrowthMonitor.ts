import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetDashboardPayloadGrowthMonitorForTest(): void {
  /* stateless */
}

export function scoreDashboardPayloadGrowthRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  const rowPressure = Math.min(1, input.dashboardRowCount / 48);
  const telemetryPressure = Math.min(1, input.telemetrySampleCount / 100);
  return Math.round(Math.min(1, rowPressure * 0.55 + telemetryPressure * 0.45) * 1000) / 1000;
}
