import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetRuntimeStabilizationBudgetManagerForTest(): void {
  /* stateless */
}

export function computeStabilizationCost(input: RuntimeSelfLimitationObserveInput): number {
  return (
    input.observerOverheadRatio * 0.25 +
    (input.orchestrationEdgeCount / 30) * 0.2 +
    input.interventionDensity * 0.2 +
    input.telemetryAmplificationScore * 0.2 +
    input.recursiveStabilizationRisk * 0.15
  );
}

export function scoreStabilizationBudgetPressure(input: RuntimeSelfLimitationObserveInput): number {
  const cost = computeStabilizationCost(input);
  const budget = 0.55;
  return Math.round(Math.max(0, Math.min(1, cost / budget)) * 1000) / 1000;
}
