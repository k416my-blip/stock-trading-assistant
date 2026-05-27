import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetObserverEcosystemInflationMonitorForTest(): void {
  /* stateless */
}

export function scoreObserverEcosystemInflationRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  let risk = input.observerCivilizationRisk * 0.35;
  risk += input.observerOverheadRatio * 0.25;
  risk += input.observerDensityScore * 0.2;
  risk += input.telemetryAmplificationScore * 0.15;
  if (input.runtimeAuditCoverage > 0.72) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
