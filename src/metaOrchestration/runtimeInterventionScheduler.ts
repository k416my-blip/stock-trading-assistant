import type { SurvivabilityLayerId } from '../types/metaRuntimeOrchestration';
import { SURVIVABILITY_LAYER_PRIORITY } from '../constants/metaRuntimeOrchestration';

const schedule: { layer: SurvivabilityLayerId; at: number }[] = [];

export function resetRuntimeInterventionSchedulerForTest(): void {
  schedule.length = 0;
}

export function scheduleIntervention(layer: SurvivabilityLayerId, now = Date.now()): void {
  schedule.push({ layer, at: now });
  if (schedule.length > 120) schedule.shift();
}

export function computeInterventionDensity(now = Date.now(), windowMs = 60_000): number {
  const recent = schedule.filter((s) => now - s.at <= windowMs);
  return Math.round(Math.min(1, recent.length / 20) * 1000) / 1000;
}

export function nextScheduledLayer(): SurvivabilityLayerId[] {
  return (Object.keys(SURVIVABILITY_LAYER_PRIORITY) as SurvivabilityLayerId[]).sort(
    (a, b) => SURVIVABILITY_LAYER_PRIORITY[a] - SURVIVABILITY_LAYER_PRIORITY[b],
  );
}

export function getInterventionSchedule(): { layer: SurvivabilityLayerId; at: number }[] {
  return [...schedule];
}
