import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetWebsocketInstabilityAttributionForTest(): void {
  /* stateless */
}

export function scoreWebsocketInstability(input: CausalIntelligenceObserveInput): number {
  let score = Math.min(0.5, input.reconnectPerMin / 20);
  score += Math.min(0.25, input.wsDuplicateCount / 30);
  if (input.heartbeatAgeMs > 6000) score += 0.2;
  if (input.miuiAggressiveReclaim) score += 0.15;
  if (input.screenOff) score += 0.1;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
