import type { AutonomousGovernanceObserveInput } from '../../types/autonomousStabilityGovernance';

export function scoreRuntimeStability(input: AutonomousGovernanceObserveInput): number {
  let score = 100;
  if (input.eventLoopLagMs > 300) score -= 18;
  if (input.renderFps < 14) score -= 12;
  if (input.renderStormRisk > 0.6) score -= 10;
  if (input.memoryTrendPct > 70) score -= 8;
  score -= Math.round((1 - input.recoverySuccessRate) * 15);
  score += Math.round(input.continuityScore * 0.08);
  score += Math.round(input.jsSurvivalScore * 0.05);
  return Math.max(0, Math.min(100, score));
}

export function resetRuntimeStabilityScoringEngineForTest(): void {
  /* stateless */
}
