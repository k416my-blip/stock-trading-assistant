import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

const fatigueEvolution: { at: string; score: number }[] = [];

export function resetRuntimeFatigueCoordinatorForTest(): void {
  fatigueEvolution.length = 0;
}

export function scoreRuntimeFatigue(input: MetaOrchestrationObserveInput): number {
  let fatigue = 0.15;
  if (input.sessionMinutes > 90) fatigue += 0.15;
  if (input.sessionMinutes > 150) fatigue += 0.2;
  fatigue += input.observerOverheadRatio * 0.25;
  fatigue += (1 - input.recoverySuccessRate) * 0.15;
  if (input.eventLoopLagMs > 350) fatigue += 0.1;
  if (input.miuiAggressiveReclaim) fatigue += 0.08;
  return Math.round(Math.min(1, fatigue) * 1000) / 1000;
}

export function noteRuntimeFatigueScore(score: number): void {
  fatigueEvolution.push({ at: new Date().toISOString(), score });
  if (fatigueEvolution.length > 64) fatigueEvolution.shift();
}

export function getRuntimeFatigueEvolution(): { at: string; score: number }[] {
  return [...fatigueEvolution];
}
