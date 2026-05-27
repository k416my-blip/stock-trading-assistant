import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function computeTradingRuntimeHealth(input: TradingSurvivabilityObserveInput): number {
  let health = 100;
  if (input.eventLoopLagMs > 350) health -= 20;
  if (input.renderFps < 12) health -= 12;
  if (input.memoryTrendPct > 70) health -= 10;
  health -= Math.round((1 - input.recoverySuccessRate) * 18);
  health += Math.round(input.continuityScore * 0.06);
  health += Math.round(input.governanceConfidence * 0.04);
  return Math.max(0, Math.min(100, health));
}

export function resetRuntimeAwareTradingCoordinatorForTest(): void {
  /* stateless */
}
