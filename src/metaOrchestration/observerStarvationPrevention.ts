import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

export function resetObserverStarvationPreventionForTest(): void {
  /* stateless */
}

export function scoreObserverStarvationRisk(input: MetaOrchestrationObserveInput): number {
  let risk = 0;
  if (input.miuiAggressiveReclaim && input.screenOff) risk += 0.35;
  if (!input.appForeground && input.observerOverheadRatio < 0.15) risk += 0.2;
  if (input.batterySaver && input.observerOverheadRatio < 0.2) risk += 0.15;
  if (input.hydrationOverlapCount > 0 && input.observerOverheadRatio < 0.25) risk += 0.1;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function shouldPreserveCriticalObservers(input: MetaOrchestrationObserveInput): boolean {
  return scoreObserverStarvationRisk(input) > 0.35;
}
