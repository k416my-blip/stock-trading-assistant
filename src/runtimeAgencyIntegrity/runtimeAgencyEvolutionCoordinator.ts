import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

const agencyEvolution: { at: string; variance: number }[] = [];

export function resetRuntimeAgencyEvolutionCoordinatorForTest(): void {
  agencyEvolution.length = 0;
}

export function scoreAgencyVariance(input: RuntimeAgencyIntegrityObserveInput): number {
  const agencies = [
    input.runtimeSelfLimitationScore,
    1 - input.interventionDensity,
    1 - input.observerOverheadRatio,
    input.simplificationIntegrity,
    input.runtimePurposeIntegrityScore,
  ];
  const mean = agencies.reduce((a, b) => a + b, 0) / agencies.length;
  return Math.round(
    (agencies.reduce((a, v) => a + (v - mean) ** 2, 0) / agencies.length) * 1000,
  ) / 1000;
}

export function scoreObserverRecursionAgency(input: RuntimeAgencyIntegrityObserveInput): number {
  return Math.round(
    (input.observerDensityScore * 0.35 +
      input.telemetryAmplificationScore * 0.3 +
      input.metaRecursionRisk * 0.35) *
      1000,
  ) / 1000;
}

export function scoreAutonomyRigidity(input: RuntimeAgencyIntegrityObserveInput): number {
  let rigidity = input.equilibriumPersistence * 0.3;
  rigidity += input.runtimeCalmnessIndex * 0.25;
  rigidity += input.runtimeWorldviewLockRisk * 0.2;
  rigidity += (1 - input.simplificationIntegrity) * 0.15;
  const rounded = Math.round(Math.min(1, rigidity) * 1000) / 1000;
  agencyEvolution.push({ at: new Date().toISOString(), variance: rounded });
  if (agencyEvolution.length > 64) agencyEvolution.shift();
  return rounded;
}

export function scoreGovernancePersistence(input: RuntimeAgencyIntegrityObserveInput): number {
  return Math.round(
    (input.governanceConfidence * 0.4 +
      input.runtimeAuditCoverage * 0.3 +
      input.equilibriumPersistence * 0.3) *
      1000,
  ) / 1000;
}

export function scoreEquilibriumFixation(input: RuntimeAgencyIntegrityObserveInput): number {
  return Math.round(
    (input.equilibriumPersistence * 0.5 + input.runtimeCalmnessIndex * 0.5) * 1000,
  ) / 1000;
}

export function getAgencyEvolution(): { at: string; variance: number }[] {
  return [...agencyEvolution];
}
