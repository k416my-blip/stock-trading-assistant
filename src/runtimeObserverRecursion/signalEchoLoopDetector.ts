import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetSignalEchoLoopDetectorForTest(): void {
  /* stateless */
}

export function scoreRecursiveSignalEchoRisk(input: RuntimeObserverRecursionObserveInput): number {
  let risk = 0;
  if (input.reconnectPerMin > 4 && input.observerOverheadRatio > 0.35) risk += 0.3;
  if (input.bridgeTrafficRate > 10 && input.telemetryAmplificationScore > 0.4) risk += 0.28;
  if (input.interventionDensity > 0.45) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
