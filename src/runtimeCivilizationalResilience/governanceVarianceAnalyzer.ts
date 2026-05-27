import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetGovernanceVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function scoreGovernancePathVariance(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const paths = [
    input.governanceConfidence,
    1 - input.runtimeTradingSuppression,
    input.runtimeSelfLimitationScore,
    1 - input.runtimeAmplificationRisk,
  ];
  const mean = paths.reduce((a, b) => a + b, 0) / paths.length;
  return Math.round(
    (paths.reduce((a, p) => a + (p - mean) ** 2, 0) / paths.length) * 1000,
  ) / 1000;
}
