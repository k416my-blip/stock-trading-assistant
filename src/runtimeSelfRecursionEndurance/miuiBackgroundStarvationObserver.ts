import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetMiuiBackgroundStarvationObserverForTest(): void {
  /* stateless */
}

export function scoreMiuiBackgroundStarvationRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  let risk = 0.04;
  if (!input.appForeground || input.screenOff) risk += 0.28;
  if (input.miuiAggressiveReclaim) risk += 0.32;
  if (input.thermalState === 'severe' || input.thermalState === 'critical') risk += 0.14;
  if (input.observerOverheadRatio > 0.5 && !input.appForeground) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
