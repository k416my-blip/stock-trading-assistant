import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

const resilienceEvolution: { at: string; score: number }[] = [];

export function resetRuntimeResilienceScoreAuditorForTest(): void {
  resilienceEvolution.length = 0;
}

export function scoreRuntimeResilience(input: SurvivabilityAuditObserveInput): number {
  let resilience = input.recoverySuccessRate * 0.3;
  resilience += (input.continuityScore / 100) * 0.25;
  resilience += input.runtimeEquilibriumStability * 0.2;
  resilience += (1 - input.runtimeAmplificationRisk) * 0.15;
  resilience += (input.jsSurvivalScore / 100) * 0.1;
  const rounded = Math.round(Math.max(0, Math.min(1, resilience)) * 1000) / 1000;
  resilienceEvolution.push({ at: new Date().toISOString(), score: rounded });
  if (resilienceEvolution.length > 64) resilienceEvolution.shift();
  return rounded;
}

export function getResilienceEvolution(): { at: string; score: number }[] {
  return [...resilienceEvolution];
}
