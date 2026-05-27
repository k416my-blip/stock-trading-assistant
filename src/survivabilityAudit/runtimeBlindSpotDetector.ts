import type { AuditGraphSnapshot, SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimeBlindSpotDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeBlindSpotRisk(input: SurvivabilityAuditObserveInput): number {
  let risk = 0;
  if (input.runtimeTradingSuppression > 0.5 && input.observerOverheadRatio < 0.2) risk += 0.2;
  if (input.loadSheddingSeverity > 0.4) risk += 0.25;
  if (input.heartbeatAgeMs > 8000) risk += 0.2;
  if (input.staleHydrationRisk > 0.35) risk += 0.15;
  if (input.telemetryAmplificationScore < 0.1 && input.observerOverheadRatio < 0.15) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function detectBlindSpots(input: SurvivabilityAuditObserveInput): string[] {
  const gaps: string[] = [];
  if (input.heartbeatAgeMs > 6000) gaps.push('websocket_untracked_window');
  if (input.staleHydrationRisk > 0.3) gaps.push('stale_metrics');
  if (input.loadSheddingSeverity > 0.45) gaps.push('telemetry_gap');
  if (input.recoverySuccessRate > 0.7 && input.continuityScore < 65) gaps.push('invisible_recovery');
  return gaps;
}

export function buildBlindSpotMap(input: SurvivabilityAuditObserveInput): AuditGraphSnapshot {
  const spots = detectBlindSpots(input);
  return {
    nodes: spots.map((s) => ({ id: s, label: s, score: scoreRuntimeBlindSpotRisk(input) })),
    edges: spots.map((s, i) => ({
      from: s,
      to: spots[(i + 1) % Math.max(1, spots.length)] ?? s,
      weight: 0.4,
    })),
    measuredAt: new Date().toISOString(),
  };
}
