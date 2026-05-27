import type {
  EpistemicGraphSnapshot,
  RuntimeEpistemicIntegrityObserveInput,
} from '../types/runtimeEpistemicIntegrity';
import { EPISTEMIC_CONSISTENCY_LAYERS } from '../constants/runtimeEpistemicIntegrity';

export function resetCrossLayerEpistemicConsistencyHarmonizerForTest(): void {
  /* stateless */
}

function epistemicScore(input: RuntimeEpistemicIntegrityObserveInput, layer: string): number {
  switch (layer) {
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'stability':
      return input.runtimeHomeostasisScore;
    case 'continuity':
      return input.continuityScore / 100;
    case 'observer':
      return 1 - input.observerDensityScore;
    case 'audit':
      return 1 - input.runtimeAuditCoverage;
    case 'governance':
      return 1 - input.runtimeGovernanceInflationRisk;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    default:
      return 0.5;
  }
}

export function scoreCrossLayerEpistemicConsistency(
  input: RuntimeEpistemicIntegrityObserveInput,
): number {
  const scores = EPISTEMIC_CONSISTENCY_LAYERS.map((l) => epistemicScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.3))) * 1000) / 1000;
}

export function buildCrossLayerEpistemicGraph(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicGraphSnapshot {
  const nodes = EPISTEMIC_CONSISTENCY_LAYERS.map((l) => ({
    id: l,
    label: l,
    score: epistemicScore(input, l),
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
