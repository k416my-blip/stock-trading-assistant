import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetAdaptiveCeilingGovernorForTest(): void {
  /* stateless */
}

export function scoreRuntimeAdaptiveInflationRisk(input: RuntimeSelfLimitationObserveInput): number {
  let risk = 0;
  if (input.interventionDensity > 0.45) risk += 0.25;
  if (input.observerDensityScore > 0.5) risk += 0.2;
  if (input.telemetryAmplificationScore > 0.4) risk += 0.2;
  if (input.runtimeComplexityScore > 0.45) risk += 0.15;
  if (input.sessionMinutes >= 120) risk += 0.1;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function suggestAdaptiveCeilings(input: RuntimeSelfLimitationObserveInput): Record<string, number> {
  const risk = scoreRuntimeAdaptiveInflationRisk(input);
  return {
    pacing_ceiling: Math.round((0.85 - risk * 0.3) * 1000) / 1000,
    observer_ceiling: Math.round((0.8 - risk * 0.35) * 1000) / 1000,
    telemetry_ceiling: Math.round((0.75 - risk * 0.4) * 1000) / 1000,
  };
}
