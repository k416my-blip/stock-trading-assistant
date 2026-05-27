import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetAiResponseLatencyBalancerForTest(): void {
  /* stateless */
}

export function computeAiLatencyBalance(input: TradingSurvivabilityObserveInput): number {
  let balance = 0.85;
  if (input.eventLoopLagMs > 250) balance -= 0.15;
  if (input.bridgeTrafficRate > 10) balance -= 0.12;
  if (input.renderFps < 14) balance -= 0.1;
  if (input.runtimeFatigue > 0.55) balance -= 0.08;
  return Math.round(Math.max(0, Math.min(1, balance)) * 1000) / 1000;
}

export function maxAiResponseTokens(input: TradingSurvivabilityObserveInput): number {
  const balance = computeAiLatencyBalance(input);
  if (balance < 0.5) return 256;
  if (balance < 0.7) return 512;
  return 1024;
}
