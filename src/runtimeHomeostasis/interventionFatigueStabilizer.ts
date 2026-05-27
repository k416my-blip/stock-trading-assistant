import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

const fatigueTimeline: { at: string; fatigue: number }[] = [];
let consecutiveInterventions = 0;

export function resetInterventionFatigueStabilizerForTest(): void {
  fatigueTimeline.length = 0;
  consecutiveInterventions = 0;
}

export function noteInterventionCycle(active: boolean): void {
  if (active) consecutiveInterventions += 1;
  else consecutiveInterventions = Math.max(0, consecutiveInterventions - 1);
}

export function scoreInterventionFatigueLevel(input: RuntimeHomeostasisObserveInput): number {
  let fatigue = input.interventionDensity * 0.3;
  fatigue += Math.min(1, consecutiveInterventions / 8) * 0.25;
  fatigue += input.loadSheddingSeverity * 0.15;
  fatigue += input.runtimeTradingSuppression * 0.15;
  fatigue += input.recursiveStabilizationRisk * 0.1;
  if (input.sessionMinutes >= 120) fatigue += 0.05;
  const rounded = Math.round(Math.min(1, fatigue) * 1000) / 1000;
  fatigueTimeline.push({ at: new Date().toISOString(), fatigue: rounded });
  if (fatigueTimeline.length > 64) fatigueTimeline.shift();
  return rounded;
}

export function getInterventionFatigueTimeline(): { at: string; fatigue: number }[] {
  return [...fatigueTimeline];
}
