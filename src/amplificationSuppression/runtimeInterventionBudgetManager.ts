import { AMPLIFICATION_INTERVENTION_BUDGET } from '../constants/amplificationSuppression';

let interventionCount = 0;
let windowStart = Date.now();

export function resetRuntimeInterventionBudgetManagerForTest(): void {
  interventionCount = 0;
  windowStart = Date.now();
}

export function noteIntervention(now = Date.now()): void {
  if (now - windowStart > 60_000) {
    interventionCount = 0;
    windowStart = now;
  }
  interventionCount += 1;
}

export function computeRuntimeInterventionDensity(): number {
  return Math.round(Math.min(1, interventionCount / AMPLIFICATION_INTERVENTION_BUDGET) * 1000) / 1000;
}

export function isInterventionBudgetExhausted(): boolean {
  return interventionCount >= AMPLIFICATION_INTERVENTION_BUDGET;
}
