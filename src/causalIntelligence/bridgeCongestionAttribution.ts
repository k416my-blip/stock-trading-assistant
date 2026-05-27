import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetBridgeCongestionAttributionForTest(): void {
  /* stateless */
}

export function scoreBridgeCausality(input: CausalIntelligenceObserveInput): number {
  let score = Math.min(1, input.bridgeTrafficRate / 15);
  if (input.renderStormRisk > 0.5) score += 0.15;
  if (input.eventLoopLagMs > 280) score += 0.12;
  if (input.schedulerDriftMs > 40) score += 0.08;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
