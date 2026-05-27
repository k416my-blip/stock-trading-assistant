import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { REALITY_MODEL_DIMENSIONS } from '../constants/runtimeEpistemicIntegrity';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeRealityModelingCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreRealityDimension(input: RuntimeEpistemicIntegrityObserveInput, dim: string): number {
  switch (dim) {
    case 'audit':
      return 1 - Math.min(1, input.runtimeAuditCoverage);
    case 'governance':
      return 1 - Math.min(1, input.runtimeGovernanceInflationRisk);
    case 'orchestration':
      return 1 - Math.min(1, input.orchestrationEdgeCount / 28);
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'continuity':
      return input.continuityScore / 100;
    case 'observer':
      return 1 - input.observerOverheadRatio;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    default:
      return 0.5;
  }
}

export function scoreRuntimeRealityIntegrity(input: RuntimeEpistemicIntegrityObserveInput): number {
  const dims = REALITY_MODEL_DIMENSIONS.map((d) => scoreRealityDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  let score = mean * 0.5;
  score += input.runtimeCivilizationScore * 0.12;
  score += input.crossLayerEcologyIntegrity * 0.1;
  score += input.runtimeEcologicalConfidence * 0.08;
  score -= input.recursiveGovernanceEcologyRisk * 0.06;
  score -= input.observerEcosystemInflationRisk * 0.06;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getRealityIntegrityEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
