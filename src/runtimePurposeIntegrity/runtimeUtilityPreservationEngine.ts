import type { PurposeGraphSnapshot, RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';
import { UTILITY_DIMENSIONS } from '../constants/runtimePurposeIntegrity';

export function resetRuntimeUtilityPreservationEngineForTest(): void {
  /* stateless */
}

function scoreUtilityDimension(input: RuntimePurposeIntegrityObserveInput, dim: string): number {
  switch (dim) {
    case 'utility':
      return (input.continuityScore / 100 + input.runtimeSafeTradingScore / 100) / 2;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'simplicity':
      return input.simplificationIntegrity;
    case 'continuity':
      return input.continuityScore / 100;
    case 'latency':
      return 1 - Math.min(1, input.eventLoopLagMs / 500);
    case 'observer_cost':
      return 1 - input.observerOverheadRatio;
    case 'orchestration_spread':
      return 1 - Math.min(1, input.orchestrationEdgeCount / 28);
    default:
      return 0.5;
  }
}

export function scoreRuntimeUtilityIntegrity(input: RuntimePurposeIntegrityObserveInput): number {
  const scores = UTILITY_DIMENSIONS.map((d) => scoreUtilityDimension(input, d));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.3))) * 1000) / 1000;
}

export function scoreUtilityEquilibriumConfidence(input: RuntimePurposeIntegrityObserveInput): number {
  const integrity = scoreRuntimeUtilityIntegrity(input);
  const alignment = input.objectiveAlignmentScore;
  return Math.round(Math.max(0, Math.min(1, (integrity + alignment) / 2)) * 1000) / 1000;
}

export function buildUtilityEquilibriumGraph(input: RuntimePurposeIntegrityObserveInput): PurposeGraphSnapshot {
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
