import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetUtilityIllusionAnalyzerForTest(): void {
  /* stateless */
}

export function scoreUtilityIllusion(input: RuntimeUnifiedUtilityObserveInput): number {
  let illusion = 0;
  if (input.observerDensityScore > 0.48 && input.runtimeUtilityIntegrity > 0.72) illusion += 0.28;
  if (input.telemetryAmplificationScore > 0.38 && input.continuityScore > 80) illusion += 0.22;
  if (input.runtimeAuditCoverage > 0.7 && input.eventLoopLagMs > 300) illusion += 0.18;
  return Math.round(Math.min(1, illusion) * 1000) / 1000;
}
