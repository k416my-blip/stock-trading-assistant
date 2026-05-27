import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetRuntimeAwareWebsocketPacingForTest(): void {
  /* stateless */
}

export function computeWebsocketPressure(input: TradingSurvivabilityObserveInput): number {
  let pressure = 0.1;
  pressure += Math.min(0.4, input.reconnectPerMin / 25);
  pressure += Math.min(0.25, input.wsDuplicateCount / 20);
  if (input.heartbeatAgeMs > 5000) pressure += 0.2;
  if (input.miuiAggressiveReclaim) pressure += 0.15;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function websocketReconnectDelayMs(input: TradingSurvivabilityObserveInput): number {
  const pressure = computeWebsocketPressure(input);
  return Math.round(800 + pressure * 2200);
}
