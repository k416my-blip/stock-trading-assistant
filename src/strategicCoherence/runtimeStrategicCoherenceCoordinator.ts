import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

const coherenceHistory: { at: string; score: number }[] = [];

export function resetRuntimeStrategicCoherenceCoordinatorForTest(): void {
  coherenceHistory.length = 0;
}

function estimateObjectiveAlignment(input: StrategicCoherenceObserveInput): number {
  const layers = [
    input.recoverySuccessRate,
    input.governanceConfidence,
    input.metaCoordinationStability,
    1 - input.runtimeTradingSuppression,
    input.simplificationIntegrity,
    input.continuityScore / 100,
    input.runtimeAuditCoverage,
    input.runtimeHomeostasisScore,
  ];
  return layers.reduce((a, b) => a + b, 0) / layers.length;
}

function estimateLayerConflict(input: StrategicCoherenceObserveInput): number {
  let conflict = 0;
  if (input.simplificationIntegrity > 0.6 && input.runtimeAuditCoverage > 0.75) conflict += 0.2;
  if (input.runtimeTradingSuppression > 0.4 && input.continuityScore < 75) conflict += 0.25;
  if (input.interventionDensity > 0.45 && input.runtimeCalmnessIndex > 0.7) conflict += 0.2;
  if (input.recoverySuccessRate > 0.7 && input.equilibriumIntegrity < 0.55) conflict += 0.15;
  return Math.min(1, conflict);
}

export function scoreRuntimeStrategicCoherence(input: StrategicCoherenceObserveInput): number {
  let score = estimateObjectiveAlignment(input) * 0.2;
  score += input.survivabilityEffectiveness * 0.12;
  score += (input.continuityScore / 100) * 0.12;
  score += input.runtimeHomeostasisScore * 0.12;
  score += input.simplificationIntegrity * 0.1;
  score += input.equilibriumIntegrity * 0.1;
  score += (1 - estimateLayerConflict(input)) * 0.12;
  score += input.governanceConfidence * 0.12;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  coherenceHistory.push({ at: new Date().toISOString(), score: rounded });
  if (coherenceHistory.length > 64) coherenceHistory.shift();
  return rounded;
}

export function getCoherenceHistory(): { at: string; score: number }[] {
  return [...coherenceHistory];
}
