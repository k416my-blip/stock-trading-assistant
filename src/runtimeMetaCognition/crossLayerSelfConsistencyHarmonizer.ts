import type {
  MetaCognitionGraphSnapshot,
  RuntimeMetaCognitionObserveInput,
} from '../types/runtimeMetaCognition';
import { CROSS_LAYER_SELF_LAYERS } from '../constants/runtimeMetaCognition';

export function resetCrossLayerSelfConsistencyHarmonizerForTest(): void {
  /* stateless */
}

function selfLayerScore(input: RuntimeMetaCognitionObserveInput, layer: string): number {
  switch (layer) {
    case 'observer':
      return 1 - input.observerDensityScore;
    case 'agency':
      return input.runtimeAgencyIntegrityScore;
    case 'epistemic':
      return input.runtimeRealityIntegrityScore;
    case 'governance':
      return 1 - input.runtimeGovernanceInflationRisk;
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'continuity':
      return input.continuityScore / 100;
    case 'coherence':
      return input.runtimeStrategicCoherence;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'constraint':
      return input.simplificationIntegrity;
    default:
      return 0.5;
  }
}

export function scoreCrossLayerSelfConsistency(input: RuntimeMetaCognitionObserveInput): number {
  const scores = CROSS_LAYER_SELF_LAYERS.map((l) => selfLayerScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.28))) * 1000) / 1000;
}

export function buildCrossLayerSelfGraph(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionGraphSnapshot {
  const nodes = CROSS_LAYER_SELF_LAYERS.map((l) => ({
    id: l,
    label: l,
    score: selfLayerScore(input, l),
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
