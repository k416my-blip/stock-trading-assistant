import type {
  NarrativeGraphSnapshot,
  RuntimeNarrativeIntegrityObserveInput,
} from '../types/runtimeNarrativeIntegrity';
import { CROSS_LAYER_SEMANTIC_LAYERS } from '../constants/runtimeNarrativeIntegrity';

export function resetCrossLayerSemanticConsistencyHarmonizerForTest(): void {
  /* stateless */
}

function semanticLayerScore(input: RuntimeNarrativeIntegrityObserveInput, layer: string): number {
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
    case 'coherence':
      return input.runtimeStrategicCoherence;
    case 'continuity':
      return input.continuityScore / 100;
    case 'meta_cognition':
      return input.runtimeMetaCognitionScore;
    case 'narrative':
      return 1 - Math.min(1, input.recursiveBeliefReinforcementRisk);
    default:
      return 0.5;
  }
}

export function scoreCrossLayerSemanticConsistency(
  input: RuntimeNarrativeIntegrityObserveInput,
): number {
  const scores = CROSS_LAYER_SEMANTIC_LAYERS.map((l) => semanticLayerScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.28))) * 1000) / 1000;
}

export function buildCrossLayerSemanticGraph(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeGraphSnapshot {
  const nodes = CROSS_LAYER_SEMANTIC_LAYERS.map((l) => ({
    id: l,
    label: l,
    score: semanticLayerScore(input, l),
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
