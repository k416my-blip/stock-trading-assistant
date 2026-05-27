import type { RuntimeUnifiedUtilityObserveInput, UtilityGraphSnapshot } from '../types/runtimeUnifiedUtility';

export function resetCrossLayerUtilityHarmonizerForTest(): void {
  /* stateless */
}

const LAYER_SCORES = [
  'amplification',
  'audit',
  'compression',
  'homeostasis',
  'strategic',
  'self_limitation',
  'purpose',
] as const;

function layerScore(input: RuntimeUnifiedUtilityObserveInput, layer: string): number {
  switch (layer) {
    case 'amplification':
      return 1 - input.runtimeAmplificationRisk;
    case 'audit':
      return 1 - Math.min(1, input.runtimeAuditCoverage);
    case 'compression':
      return input.runtimeCompressionEfficiency;
    case 'homeostasis':
      return input.runtimeHomeostasisScore;
    case 'strategic':
      return input.runtimeStrategicCoherence;
    case 'self_limitation':
      return input.runtimeSelfLimitationScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    default:
      return 0.5;
  }
}

export function scoreCrossLayerUtilityConsistency(input: RuntimeUnifiedUtilityObserveInput): number {
  const scores = LAYER_SCORES.map((l) => layerScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.35))) * 1000) / 1000;
}

export function buildCrossLayerUtilityGraph(input: RuntimeUnifiedUtilityObserveInput): UtilityGraphSnapshot {
  const nodes = LAYER_SCORES.map((l) => ({
    id: l,
    label: l,
    score: layerScore(input, l),
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
