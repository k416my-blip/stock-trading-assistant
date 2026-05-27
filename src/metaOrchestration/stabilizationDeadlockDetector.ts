import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

export function resetStabilizationDeadlockDetectorForTest(): void {
  /* stateless */
}

export function scoreStabilizationDeadlockRisk(input: MetaOrchestrationObserveInput): number {
  let risk = 0;
  if (input.eventLoopLagMs > 400 && input.jsSurvivalScore < 60) risk += 0.35;
  if (input.schedulerDriftMs > 60 && input.bridgeTrafficRate > 10) risk += 0.25;
  if (input.hydrationOverlapCount > 2 && input.staleHydrationRisk > 0.5) risk += 0.2;
  if (input.renderFps < 10 && input.renderStormRisk > 0.6) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function isDeadlockLikely(input: MetaOrchestrationObserveInput): boolean {
  return scoreStabilizationDeadlockRisk(input) > 0.45;
}
