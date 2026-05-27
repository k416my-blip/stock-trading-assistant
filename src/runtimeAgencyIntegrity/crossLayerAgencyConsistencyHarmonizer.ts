import type { AgencyGraphSnapshot, RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { CROSS_LAYER_AGENCY_LAYERS } from '../constants/runtimeAgencyIntegrity';

export function resetCrossLayerAgencyConsistencyHarmonizerForTest(): void {
  /* stateless */
}

function agencyLayerScore(input: RuntimeAgencyIntegrityObserveInput, layer: string): number {
  switch (layer) {
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'continuity':
      return input.continuityScore / 100;
    case 'observer':
      return 1 - input.observerDensityScore;
    case 'audit':
      return 1 - input.runtimeAuditCoverage;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'governance':
      return 1 - input.runtimeGovernanceInflationRisk;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'agency':
      return input.runtimeSelfLimitationScore;
    case 'constraint':
      return input.simplificationIntegrity;
    default:
      return 0.5;
  }
}

export function scoreCrossLayerAgencyConsistency(input: RuntimeAgencyIntegrityObserveInput): number {
  const scores = CROSS_LAYER_AGENCY_LAYERS.map((l) => agencyLayerScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.28))) * 1000) / 1000;
}

export function buildCrossLayerAgencyGraph(input: RuntimeAgencyIntegrityObserveInput): AgencyGraphSnapshot {
  const nodes = CROSS_LAYER_AGENCY_LAYERS.map((l) => ({
    id: l,
    label: l,
    score: agencyLayerScore(input, l),
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
