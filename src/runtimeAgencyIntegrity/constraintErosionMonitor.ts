import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { CONSTRAINT_DIMENSIONS } from '../constants/runtimeAgencyIntegrity';

export function resetConstraintErosionMonitorForTest(): void {
  /* stateless */
}

function constraintScore(input: RuntimeAgencyIntegrityObserveInput, dim: string): number {
  switch (dim) {
    case 'boundary':
      return input.runtimeSelfLimitationScore;
    case 'simplicity':
      return input.simplificationIntegrity;
    case 'non_intervention':
      return 1 - input.interventionDensity;
    case 'suppression':
      return 1 - input.runtimeTradingSuppression;
    case 'read_only':
      return 1 - input.observerOverheadRatio;
    case 'constraint':
      return 1 - Math.min(1, input.runtimeComplexityScore * 0.3 + input.interventionDensity * 0.3 + input.metaRecursionRisk * 0.2);
    default:
      return 0.5;
  }
}

export function scoreRuntimeConstraintErosionRisk(input: RuntimeAgencyIntegrityObserveInput): number {
  const scores = CONSTRAINT_DIMENSIONS.map((d) => constraintScore(input, d));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(Math.max(0, Math.min(1, 1 - mean)) * 1000) / 1000;
}

export function scoreConstraintStability(input: RuntimeAgencyIntegrityObserveInput): number {
  const scores = CONSTRAINT_DIMENSIONS.map((d) => constraintScore(input, d));
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000;
}
