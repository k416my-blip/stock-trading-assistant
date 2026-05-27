import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetGovernanceDecisionAttributionForTest(): void {
  /* stateless */
}

export function scoreGovernanceAttribution(input: CausalIntelligenceObserveInput): number {
  let score = 1 - input.governanceConfidence;
  if (input.governanceMode !== 'full_observe') score += 0.15;
  if (input.observerOverheadRatio > 0.5) score += 0.1;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}

export function governanceDecisionChain(input: CausalIntelligenceObserveInput): string[] {
  return ['instability_detect', `mode:${input.governanceMode}`, 'weight_update'];
}
