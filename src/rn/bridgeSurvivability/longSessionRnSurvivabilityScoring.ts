import type { RnBridgeSurvivabilityProfile } from '../../types/rnBridgeSurvivability';

export function computeRnSurvivalScore(partial: {
  renderStormRisk: number;
  listenerLeakRisk: number;
  closureRetentionRisk: number;
  asyncFragmentationScore: number;
  bridgeTrafficRate: number;
}): number {
  let score = 100;
  if (partial.renderStormRisk > 0.7) score -= 20;
  if (partial.listenerLeakRisk > 0.6) score -= 18;
  if (partial.closureRetentionRisk > 0.65) score -= 12;
  if (partial.asyncFragmentationScore > 0.5) score -= 10;
  if (partial.bridgeTrafficRate > 10) score -= 15;
  return Math.max(0, Math.min(100, score));
}

export function attachRnSurvivalScore(
  profile: Omit<RnBridgeSurvivabilityProfile, 'survivalScore'>,
): RnBridgeSurvivabilityProfile {
  return { ...profile, survivalScore: computeRnSurvivalScore(profile) };
}
