import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';
import { CIVILIZATION_FLOW_DIMENSIONS } from '../constants/runtimeCivilizationalResilience';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeCivilizationCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreCivilizationDimension(input: RuntimeCivilizationalResilienceObserveInput, dim: string): number {
  switch (dim) {
    case 'suppression':
      return 1 - input.runtimeTradingSuppression;
    case 'governance':
      return 1 - Math.min(1, input.runtimeGovernanceInflationRisk);
    case 'audit':
      return 1 - Math.min(1, input.runtimeAuditCoverage);
    case 'orchestration':
      return 1 - Math.min(1, input.orchestrationEdgeCount / 28);
    case 'compression':
      return input.runtimeCompressionEfficiency;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'continuity':
      return input.continuityScore / 100;
    default:
      return 0.5;
  }
}

export function scoreRuntimeCivilization(input: RuntimeCivilizationalResilienceObserveInput): number {
  const dims = CIVILIZATION_FLOW_DIMENSIONS.map((d) => scoreCivilizationDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  let score = mean * 0.5;
  score += input.crossLayerUtilityConsistency * 0.15;
  score += input.runtimeUnifiedUtilityConfidence * 0.12;
  score -= input.runtimeExistentialConstraintRisk * 0.08;
  score -= input.observerCivilizationRisk * 0.08;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getCivilizationEvolution(): { at: string; score: number }[] {
  return [...evolution];
}

export function scoreCivilizationDimensionForGraph(
  input: RuntimeCivilizationalResilienceObserveInput,
  dim: string,
): number {
  return scoreCivilizationDimension(input, dim);
}
