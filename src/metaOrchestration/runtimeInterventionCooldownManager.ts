import { META_ORCHESTRATION_COOLDOWN_MS } from '../constants/metaRuntimeOrchestration';

const interventions: number[] = [];

export function resetRuntimeInterventionCooldownManagerForTest(): void {
  interventions.length = 0;
}

export function noteIntervention(now = Date.now()): void {
  interventions.push(now);
  if (interventions.length > 64) interventions.shift();
}

export function isInterventionCooldownActive(now = Date.now()): boolean {
  if (interventions.length === 0) return false;
  return now - interventions[interventions.length - 1] < META_ORCHESTRATION_COOLDOWN_MS;
}

export function scoreInterventionCooldownEfficiency(now = Date.now()): number {
  if (interventions.length < 2) return 0.85;
  const gaps: number[] = [];
  for (let i = 1; i < interventions.length; i += 1) {
    gaps.push(interventions[i] - interventions[i - 1]);
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const efficiency = Math.min(1, avgGap / META_ORCHESTRATION_COOLDOWN_MS);
  return Math.round(efficiency * 1000) / 1000;
}
