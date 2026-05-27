import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetBridgeSafeAiConversationPacingForTest(): void {
  /* stateless */
}

export function computeBridgeConversationDelayMs(input: TradingSurvivabilityObserveInput): number {
  let delay = 0;
  if (input.bridgeTrafficRate > 8) delay += 400;
  if (input.bridgeTrafficRate > 12) delay += 600;
  if (input.renderStormRisk > 0.5) delay += 300;
  if (input.eventLoopLagMs > 280) delay += 250;
  return delay;
}

export function shouldReduceProactiveAi(input: TradingSurvivabilityObserveInput): boolean {
  return input.bridgeTrafficRate > 6 || input.renderStormRisk > 0.45;
}
