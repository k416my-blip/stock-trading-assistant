import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetAuditLoopRiskScorerForTest(): void {
  /* stateless */
}

export function scoreAuditLoopRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  const auditLoop =
    input.runtimeAuditCoverage * 0.4 +
    input.interventionDensity * 0.3 +
    (input.governanceMode.includes('observe') ? 0.08 : 0.18);
  return Math.round(Math.min(1, Math.max(0.05, auditLoop)) * 1000) / 1000;
}
