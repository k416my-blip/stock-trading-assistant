import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';
import { UNIFIED_UTILITY_FIELD_DIMENSIONS } from '../constants/runtimeUnifiedUtility';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeUnifiedUtilityCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreDimension(input: RuntimeUnifiedUtilityObserveInput, dim: string): number {
  switch (dim) {
    case 'utility':
      return (input.continuityScore / 100 + input.runtimeSafeTradingScore / 100) / 2;
    case 'survivability':
      return input.survivabilityEffectiveness;
    case 'continuity':
      return input.continuityScore / 100;
    case 'stability':
      return input.runtimeHomeostasisScore;
    case 'simplicity':
      return input.simplificationIntegrity;
    case 'coherence':
      return input.runtimeStrategicCoherence;
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

export function scoreRuntimeUnifiedUtility(input: RuntimeUnifiedUtilityObserveInput): number {
  const dims = UNIFIED_UTILITY_FIELD_DIMENSIONS.map((d) => scoreDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  let score = mean * 0.55;
  score += input.runtimePurposeIntegrityScore * 0.12;
  score += input.runtimeUtilityIntegrity * 0.1;
  score += input.runtimeSelfLimitationScore * 0.08;
  score -= input.runtimeComplexityScore * 0.05;
  score -= input.metaRecursionRisk * 0.05;
  score -= input.valueDilutionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getUnifiedUtilityEvolution(): { at: string; score: number }[] {
  return [...evolution];
}

export function scoreDimensionForGraph(input: RuntimeUnifiedUtilityObserveInput, dim: string): number {
  return scoreDimension(input, dim);
}
