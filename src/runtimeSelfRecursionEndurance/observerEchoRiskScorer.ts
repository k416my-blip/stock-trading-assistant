import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetObserverEchoRiskScorerForTest(): void {
  /* stateless */
}

export function scoreObserverEchoRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  let risk = 0.05;
  if (input.observerDensityScore > 0.4 && input.observerOverheadRatio > 0.35) risk += 0.32;
  if (input.runtimeAuditCoverage > 0.65) risk += 0.22;
  if (input.metaRecursionRisk > 0.35) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
