import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { scoreRuntimeStrategicCoherence, getCoherenceHistory } from './runtimeStrategicCoherenceCoordinator';

const equilibriumTimeline: { at: string; equilibrium: number }[] = [];

export function resetRuntimeStrategicEquilibriumEvolutionForTest(): void {
  equilibriumTimeline.length = 0;
}

export function noteStrategicEquilibriumEvolution(input: StrategicCoherenceObserveInput): void {
  const score = scoreRuntimeStrategicCoherence(input);
  equilibriumTimeline.push({ at: new Date().toISOString(), equilibrium: score });
  if (equilibriumTimeline.length > 64) equilibriumTimeline.shift();
}

export function getStrategicEquilibriumTimeline(): { at: string; equilibrium: number }[] {
  if (equilibriumTimeline.length > 0) return [...equilibriumTimeline];
  return getCoherenceHistory().map((h) => ({ at: h.at, equilibrium: h.score }));
}

export function scoreEquilibriumEvolutionConfidence(input: StrategicCoherenceObserveInput): number {
  const history = getStrategicEquilibriumTimeline();
  if (history.length < 2) return 0.72;
  const recent = history.slice(-5).map((h) => h.equilibrium);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
  void input;
  return Math.round(Math.max(0, Math.min(1, mean * (1 - variance * 2))) * 1000) / 1000;
}
