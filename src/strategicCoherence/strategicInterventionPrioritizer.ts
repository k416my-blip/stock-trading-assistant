import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

const priorityTimeline: { at: string; priority: number }[] = [];

export function resetStrategicInterventionPrioritizerForTest(): void {
  priorityTimeline.length = 0;
}

export function computeInterventionPriority(input: StrategicCoherenceObserveInput): number {
  let priority = 0.5;
  if (input.continuityScore < 70) priority += 0.2;
  if (input.recoverySuccessRate < 0.7) priority += 0.15;
  if (input.thermalState === 'severe' || input.thermalState === 'critical') priority += 0.15;
  if (input.runtimeCalmnessIndex > 0.75) priority -= 0.2;
  if (input.interventionDensity > 0.55) priority -= 0.1;
  return Math.round(Math.max(0.1, Math.min(0.95, priority)) * 1000) / 1000;
}

export function scoreInterventionPriorityStability(input: StrategicCoherenceObserveInput): number {
  const priority = computeInterventionPriority(input);
  if (priorityTimeline.length < 2) {
    priorityTimeline.push({ at: new Date().toISOString(), priority });
    return 0.75;
  }
  const recent = priorityTimeline.slice(-4).map((p) => p.priority);
  const spread = Math.max(...recent, priority) - Math.min(...recent, priority);
  priorityTimeline.push({ at: new Date().toISOString(), priority });
  if (priorityTimeline.length > 64) priorityTimeline.shift();
  return Math.round(Math.max(0, Math.min(1, 1 - spread * 2)) * 1000) / 1000;
}

export function getInterventionPriorityTimeline(): { at: string; priority: number }[] {
  return [...priorityTimeline];
}
