import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetWebsocketInstabilityRiskGuardForTest(): void {
  /* stateless */
}

export function scoreWebsocketTradingRisk(input: TradingSafetyObserveInput): number {
  let risk = Math.min(0.4, input.reconnectPerMin / 18);
  risk += Math.min(0.2, input.wsDuplicateCount / 25);
  if (input.heartbeatAgeMs > 6000) risk += 0.2;
  if (input.miuiAggressiveReclaim) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function websocketReconnectPacingMs(input: TradingSafetyObserveInput): number {
  return Math.round(700 + scoreWebsocketTradingRisk(input) * 2400);
}
