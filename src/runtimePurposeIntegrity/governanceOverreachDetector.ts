import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

const pressureTimeline: { at: string; pressure: number }[] = [];

export function resetGovernanceOverreachDetectorForTest(): void {
  pressureTimeline.length = 0;
}

export function scoreRuntimeGovernanceOverreachRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.governanceConfidence > 0.78 && input.simplificationIntegrity < 0.55) risk += 0.22;
  if (input.runtimeAuditCoverage > 0.72 && input.interventionDensity > 0.4) risk += 0.22;
  if (input.runtimeTradingSuppression > 0.38 && input.continuityScore < 78) risk += 0.2;
  if (input.metaCoordinationStability > 0.75 && input.eventLoopLagMs > 280) risk += 0.18;
  const rounded = Math.round(Math.min(1, risk) * 1000) / 1000;
  pressureTimeline.push({ at: new Date().toISOString(), pressure: rounded });
  if (pressureTimeline.length > 64) pressureTimeline.shift();
  return rounded;
}

export function getGovernancePressureTimeline(): { at: string; pressure: number }[] {
  return [...pressureTimeline];
}
