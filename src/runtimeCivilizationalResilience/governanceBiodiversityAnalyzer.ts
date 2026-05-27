import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetGovernanceBiodiversityAnalyzerForTest(): void {
  /* stateless */
}

export function scoreGovernanceBiodiversity(input: RuntimeCivilizationalResilienceObserveInput): number {
  const paths = [
    1 - input.runtimeGovernanceInflationRisk,
    1 - input.runtimeTradingSuppression,
    input.runtimeSelfLimitationScore,
    input.simplificationIntegrity,
    input.objectiveAlignmentScore,
  ];
  const mean = paths.reduce((a, b) => a + b, 0) / paths.length;
  const spread = Math.max(...paths) - Math.min(...paths);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.25))) * 1000) / 1000;
}
