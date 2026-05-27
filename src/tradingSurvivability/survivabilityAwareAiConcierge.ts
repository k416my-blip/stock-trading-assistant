import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function scoreAiConciergePressure(input: TradingSurvivabilityObserveInput): number {
  let pressure = 0.15;
  pressure += Math.min(0.35, input.bridgeTrafficRate / 20);
  pressure += input.renderStormRisk * 0.25;
  if (input.eventLoopLagMs > 250) pressure += 0.15;
  if (input.runtimeFatigue > 0.6) pressure += 0.12;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function resetSurvivabilityAwareAiConciergeForTest(): void {
  /* stateless */
}
