import type { StrategicGraphSnapshot, StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { UTILITY_DIMENSIONS } from '../constants/strategicCoherence';

export function resetRuntimeUtilityEquilibriumEngineForTest(): void {
  /* stateless */
}

export function scoreUtilityDimension(input: StrategicCoherenceObserveInput, dim: string): number {
  switch (dim) {
    case 'thermal':
      return input.thermalState === 'none' ? 0.9 : input.thermalState === 'light' ? 0.7 : 0.35;
    case 'continuity':
      return input.continuityScore / 100;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'observer_cost':
      return 1 - input.observerOverheadRatio;
    case 'latency':
      return 1 - Math.min(1, input.eventLoopLagMs / 500);
    case 'stability':
      return input.runtimeEquilibriumStability;
    case 'compression':
      return input.runtimeCompressionEfficiency;
    case 'intervention_density':
      return 1 - input.interventionDensity;
    default:
      return 0.5;
  }
}

export function buildUtilityEquilibriumGraph(input: StrategicCoherenceObserveInput): StrategicGraphSnapshot {
  const nodes = UTILITY_DIMENSIONS.map((d) => ({
    id: d,
    label: d,
    score: scoreUtilityDimension(input, d),
  }));
  const mean = nodes.reduce((a, n) => a + n.score, 0) / nodes.length;
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: mean,
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreGlobalUtilityEquilibrium(input: StrategicCoherenceObserveInput): number {
  const scores = UTILITY_DIMENSIONS.map((d) => scoreUtilityDimension(input, d));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.3))) * 1000) / 1000;
}
