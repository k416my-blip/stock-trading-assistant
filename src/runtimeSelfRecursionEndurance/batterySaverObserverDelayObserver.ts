import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetBatterySaverObserverDelayObserverForTest(): void {
  /* stateless */
}

export function scoreBatterySaverObserverDelayRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  if (!input.batterySaver) return 0.06;
  const delay =
    0.22 +
    input.observerOverheadRatio * 0.28 +
    (input.screenOff ? 0.22 : 0.1) +
    Math.min(0.2, input.eventLoopLagMs / 800);
  return Math.round(Math.min(1, delay) * 1000) / 1000;
}
