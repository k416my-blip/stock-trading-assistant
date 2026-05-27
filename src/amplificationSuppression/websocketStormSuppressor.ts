import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetWebsocketStormSuppressorForTest(): void {
  /* stateless */
}

export function scoreWebsocketStormRisk(input: AmplificationSuppressionObserveInput): number {
  let risk = Math.min(0.45, input.reconnectPerMin / 16);
  risk += Math.min(0.25, input.wsDuplicateCount / 28);
  if (input.heartbeatAgeMs > 7000) risk += 0.2;
  if (input.miuiAggressiveReclaim) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function exponentialReconnectDelayMs(input: AmplificationSuppressionObserveInput): number {
  const risk = scoreWebsocketStormRisk(input);
  return Math.round(600 * Math.pow(2, Math.min(4, risk * 5)));
}

export function shouldReduceWebsocketObservers(risk: number): boolean {
  return risk > 0.4;
}
