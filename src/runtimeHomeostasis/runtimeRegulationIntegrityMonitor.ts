import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetRuntimeRegulationIntegrityMonitorForTest(): void {
  /* stateless */
}

export function scoreRegulationIntegrity(input: RuntimeHomeostasisObserveInput): number {
  let integrity = 0.75;
  if (input.governanceConfidence > 0.65) integrity += 0.1;
  if (input.runtimeAuditCoverage > 0.6) integrity += 0.08;
  if (runtimeSelfRegulationScoreEstimate(input) > 0.6) integrity += 0.07;
  if (input.interventionDensity > 0.65) integrity -= 0.12;
  if (input.recursiveStabilizationRisk > 0.5) integrity -= 0.1;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}

function runtimeSelfRegulationScoreEstimate(input: RuntimeHomeostasisObserveInput): number {
  return Math.max(0, 0.7 - input.interventionDensity * 0.3 - input.runtimeEntropyScore * 0.2);
}
