import type { LimitationGraphSnapshot, RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetRecursiveEquilibriumInflationTrackerForTest(): void {
  /* stateless */
}

export function scoreStabilizationInertia(input: RuntimeSelfLimitationObserveInput): number {
  return Math.round(
    Math.min(1, input.equilibriumPersistence * 0.5 + input.runtimeCalmnessIndex * 0.3 + input.interventionDensity * 0.2) *
      1000,
  ) / 1000;
}

export function scoreInterventionMomentum(input: RuntimeSelfLimitationObserveInput): number {
  return Math.round(
    Math.min(1, input.interventionDensity * 0.45 + input.loadSheddingSeverity * 0.3 + input.recursiveStabilizationRisk * 0.25) *
      1000,
  ) / 1000;
}

export function scoreRecursiveEquilibriumInflation(input: RuntimeSelfLimitationObserveInput): number {
  let inflation = 0;
  if (input.equilibriumPersistence > 0.75 && input.interventionDensity > 0.35) inflation += 0.25;
  if (input.runtimeHomeostasisScore > 0.7 && input.runtimeComplexityScore > 0.45) inflation += 0.2;
  if (input.runtimeCalmnessIndex > 0.72 && input.observerOverheadRatio > 0.4) inflation += 0.2;
  inflation += scoreStabilizationInertia(input) * 0.2;
  inflation += scoreInterventionMomentum(input) * 0.15;
  return Math.round(Math.min(1, inflation) * 1000) / 1000;
}

export function buildEquilibriumInflationGraph(input: RuntimeSelfLimitationObserveInput): LimitationGraphSnapshot {
  const inflation = scoreRecursiveEquilibriumInflation(input);
  const nodes = ['equilibrium_persistence', 'stabilization_inertia', 'intervention_momentum', 'calm_state_lock'];
  return {
    nodes: nodes.map((n) => ({ id: n, label: n, score: inflation })),
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n,
      to: nodes[i + 1] ?? n,
      weight: inflation,
    })),
    measuredAt: new Date().toISOString(),
  };
}
