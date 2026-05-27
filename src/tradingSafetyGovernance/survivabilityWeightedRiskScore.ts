import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { computeRuntimeTradingRisk } from './runtimeRiskGovernanceCoordinator';
import { scaleSurvivabilityWeightedConfidence } from './survivabilityAwareConfidenceScaler';

export function resetSurvivabilityWeightedRiskScoreForTest(): void {
  /* stateless */
}

export function scoreSurvivabilityWeightedRisk(input: TradingSafetyObserveInput): number {
  const risk = computeRuntimeTradingRisk(input);
  const conf = scaleSurvivabilityWeightedConfidence(input);
  return Math.round(Math.min(1, risk * (1.1 - conf * 0.3)) * 1000) / 1000;
}
