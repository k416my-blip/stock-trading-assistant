import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { scoreRootCause, type RootCauseCandidate } from './failureAttributionEngine';

export function resetCausalConfidenceScorerForTest(): void {
  /* stateless */
}

export function scoreCausalConfidence(
  input: CausalIntelligenceObserveInput,
  candidates: RootCauseCandidate[],
  correlationStrength: number,
): number {
  const root = scoreRootCause(candidates);
  let confidence = root * 0.45 + correlationStrength * 0.35;
  if (input.recoverySuccessRate > 0.6) confidence += 0.08;
  if (input.continuityScore > 70) confidence += 0.07;
  confidence += (input.governanceConfidence * 0.05);
  return Math.round(Math.min(1, confidence) * 1000) / 1000;
}
