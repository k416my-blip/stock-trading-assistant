import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetObserverAgencyFusionDetectorForTest(): void {
  /* stateless */
}

export function scoreObserverAgencyFusionRisk(input: RuntimeAgencyIntegrityObserveInput): number {
  let risk = 0;
  if (input.observerDensityScore > 0.5 && input.orchestrationEdgeCount > 16) risk += 0.28;
  if (input.observerOverheadRatio > 0.45 && input.metaCoordinationStability > 0.72) risk += 0.25;
  if (input.observerConfirmationLoopRisk > 0.35 && input.interventionDensity > 0.38) risk += 0.2;
  if (input.observerEcosystemInflationRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
