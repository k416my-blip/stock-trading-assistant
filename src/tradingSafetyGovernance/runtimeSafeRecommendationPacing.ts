import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeSafeRecommendationPacingForTest(): void {
  /* stateless */
}

export function recommendationFrequencyMultiplier(
  confidence: number,
  instabilityRisk: number,
): number {
  const base = 0.5 + confidence * 0.5;
  return Math.round(Math.max(0.25, base * (1 - instabilityRisk * 0.35)) * 100) / 100;
}

export function shouldPaceRecommendations(input: TradingSafetyObserveInput, confidence: number): boolean {
  return confidence < 0.55 || input.observerOverheadRatio > 0.5 || input.eventLoopLagMs > 280;
}
