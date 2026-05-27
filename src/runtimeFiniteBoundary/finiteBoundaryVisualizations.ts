import type {
  FiniteBoundaryGraph,
  RuntimeFiniteBoundaryProfile,
} from '../types/runtimeFiniteBoundary';
import {
  FINITE_BOUNDARY_RECURSION_LADDER,
  FINITE_BOUNDARY_STACK_LAYERS,
} from '../constants/runtimeFiniteBoundary';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetFiniteBoundaryVisualizationsForTest(): void {
  /* stateless */
}

export function buildObservationBudgetGauge(profile: RuntimeFiniteBoundaryProfile): { label: string; value: number }[] {
  return [
    { label: 'observer', value: profile.observerBudgetConsumption },
    { label: 'semantic entropy', value: profile.semanticEntropyBudget },
    { label: 'recursion', value: profile.recursionBudgetUsage },
    { label: 'dashboard', value: profile.dashboardAttentionBudget },
    { label: 'civilization mass', value: profile.civilizationStackMassIndex },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildRecursionBudgetLadder(profile: RuntimeFiniteBoundaryProfile): { rung: string; usage: number }[] {
  return FINITE_BOUNDARY_RECURSION_LADDER.map((rung, index) => ({
    rung,
    usage: round(profile.recursionBudgetUsage * (0.68 + index * 0.06)),
  }));
}

export function buildSemanticEntropyRadar(profile: RuntimeFiniteBoundaryProfile): { axis: string; value: number }[] {
  return [
    { axis: 'entropy budget', value: profile.semanticEntropyBudget },
    { axis: 'containment', value: profile.semanticEntropyContainment },
    { axis: 'metric containment', value: profile.metricContainmentRatio },
    { axis: 'collapse threshold', value: profile.semanticCollapseThreshold },
    { axis: 'symbolic density', value: profile.symbolicDensityBudget },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildFiniteBoundaryGraph(profile: RuntimeFiniteBoundaryProfile): FiniteBoundaryGraph {
  const nodes = FINITE_BOUNDARY_STACK_LAYERS.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    boundedness: round(profile.runtimeFiniteBoundaryIndex * (0.72 + index * 0.05)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      pressure: round(profile.civilizationStackMassIndex),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildObserverMassHeatmap(profile: RuntimeFiniteBoundaryProfile): { layer: string; mass: number }[] {
  const mass = [
    profile.observerBudgetConsumption,
    profile.telemetryNoiseBudget,
    profile.governanceExpansionBudget,
    profile.ontologyComplexityBudget,
    profile.semanticEntropyBudget,
    profile.civilizationStackMassIndex,
  ];
  return FINITE_BOUNDARY_STACK_LAYERS.map((layer, index) => ({
    layer,
    mass: round(mass[index] ?? profile.civilizationStackMassIndex),
  }));
}

export function buildCivilizationStackPressureTimeline(
  profile: RuntimeFiniteBoundaryProfile,
  prior: { at: string; pressure: number }[],
): { at: string; pressure: number }[] {
  return [...prior, { at: new Date().toISOString(), pressure: profile.civilizationStackMassIndex }].slice(-48);
}
