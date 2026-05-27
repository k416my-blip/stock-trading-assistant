import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { AGENCY_FLOW_DIMENSIONS } from '../constants/runtimeAgencyIntegrity';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeAgencyIntegrityCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreAgencyDimension(input: RuntimeAgencyIntegrityObserveInput, dim: string): number {
  switch (dim) {
    case 'observer':
      return 1 - input.observerOverheadRatio;
    case 'orchestration':
      return 1 - Math.min(1, input.orchestrationEdgeCount / 28);
    case 'governance':
      return 1 - Math.min(1, input.runtimeGovernanceInflationRisk);
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'continuity':
      return input.continuityScore / 100;
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'audit':
      return 1 - Math.min(1, input.runtimeAuditCoverage);
    default:
      return 0.5;
  }
}

export function scoreRuntimeAgencyIntegrity(input: RuntimeAgencyIntegrityObserveInput): number {
  const dims = AGENCY_FLOW_DIMENSIONS.map((d) => scoreAgencyDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  const spread = Math.max(...dims) - Math.min(...dims);
  let score = mean * (1 - spread * 0.2) * 0.5;
  score += input.runtimeRealityIntegrityScore * 0.12;
  score += input.runtimeSelfLimitationScore * 0.1;
  score += input.runtimeEpistemicConfidence * 0.08;
  score -= input.recursiveBeliefReinforcementRisk * 0.06;
  score -= input.observerConfirmationLoopRisk * 0.06;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getAgencyIntegrityEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
