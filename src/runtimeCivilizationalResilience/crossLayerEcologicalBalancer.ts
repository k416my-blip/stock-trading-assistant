import type {
  EcologyGraphSnapshot,
  RuntimeCivilizationalResilienceObserveInput,
} from '../types/runtimeCivilizationalResilience';

const ECOSYSTEM_LAYERS = [
  'utility',
  'stability',
  'survivability',
  'simplicity',
  'continuity',
  'intervention',
  'observer',
] as const;

export function resetCrossLayerEcologicalBalancerForTest(): void {
  /* stateless */
}

function ecologyScore(input: RuntimeCivilizationalResilienceObserveInput, layer: string): number {
  switch (layer) {
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'stability':
      return input.runtimeHomeostasisScore;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'simplicity':
      return input.simplificationIntegrity;
    case 'continuity':
      return input.continuityScore / 100;
    case 'intervention':
      return 1 - input.interventionDensity;
    case 'observer':
      return 1 - input.observerDensityScore;
    default:
      return 0.5;
  }
}

export function scoreCrossLayerEcologyIntegrity(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const scores = ECOSYSTEM_LAYERS.map((l) => ecologyScore(input, l));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.3))) * 1000) / 1000;
}

export function buildCrossLayerEcologyGraph(
  input: RuntimeCivilizationalResilienceObserveInput,
): EcologyGraphSnapshot {
  const nodes = ECOSYSTEM_LAYERS.map((l) => ({
    id: l,
    label: l,
    score: ecologyScore(input, l),
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
