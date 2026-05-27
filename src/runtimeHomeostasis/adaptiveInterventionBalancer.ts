import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetAdaptiveInterventionBalancerForTest(): void {
  /* stateless */
}

export function scoreRuntimeInterventionPressure(input: RuntimeHomeostasisObserveInput): number {
  let pressure = input.interventionDensity * 0.35;
  pressure += input.runtimeTradingSuppression * 0.25;
  pressure += input.loadSheddingSeverity * 0.2;
  pressure += input.recursiveStabilizationRisk * 0.12;
  pressure += input.runtimeAmplificationRisk * 0.08;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function scoreAdaptiveStabilityBalance(input: RuntimeHomeostasisObserveInput): number {
  const pressure = scoreRuntimeInterventionPressure(input);
  const benefit = input.survivabilityEffectiveness + input.continuityScore / 100;
  return Math.round(Math.max(0, Math.min(1, benefit / (pressure + 0.5))) * 1000) / 1000;
}
