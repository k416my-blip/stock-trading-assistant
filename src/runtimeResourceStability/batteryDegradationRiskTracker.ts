import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetBatteryDegradationRiskTrackerForTest(): void {
  /* stateless */
}

export function scoreRuntimeBatteryRisk(input: RuntimeResourceStabilityObserveInput): number {
  let risk = 0;
  if (input.batterySaver) risk += 0.35;
  if (input.screenOff && input.observerOverheadRatio > 0.3) risk += 0.25;
  if (input.thermalState === 'severe' || input.thermalState === 'critical') risk += 0.25;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
