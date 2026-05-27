import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

const effectivenessHistory: { at: string; score: number }[] = [];

export function resetSurvivabilityEffectivenessAuditorForTest(): void {
  effectivenessHistory.length = 0;
}

export function scoreSurvivabilityEffectiveness(input: SurvivabilityAuditObserveInput): number {
  let eff = input.recoverySuccessRate * 0.25;
  eff += (input.continuityScore / 100) * 0.2;
  eff += (input.runtimeSafeTradingScore / 100) * 0.15;
  eff += (1 - input.runtimeAmplificationRisk) * 0.15;
  eff += input.equilibriumScore * 0.1;
  eff += (1 - Math.min(1, input.eventLoopLagMs / 500)) * 0.1;
  eff += (1 - Math.min(1, input.reconnectPerMin / 15)) * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, eff)) * 1000) / 1000;
  effectivenessHistory.push({ at: new Date().toISOString(), score: rounded });
  if (effectivenessHistory.length > 64) effectivenessHistory.shift();
  return rounded;
}

export function getEffectivenessEvolution(): { at: string; score: number }[] {
  return [...effectivenessHistory];
}

export function computeImprovementRate(before: number, after: number): number {
  if (before <= 0) return after;
  return Math.round(((after - before) / before) * 1000) / 1000;
}
