import { META_ORCHESTRATION_HYSTERESIS_MS } from '../constants/metaRuntimeOrchestration';

let lastBand: 'healthy' | 'degraded' = 'healthy';
let lastTransitionAt = 0;

export function resetMetaHysteresisControllerForTest(): void {
  lastBand = 'healthy';
  lastTransitionAt = 0;
}

export function applyMetaHysteresis(stabilityScore: number, now = Date.now()): 'healthy' | 'degraded' {
  const target = stabilityScore >= 68 ? 'healthy' : 'degraded';
  if (target === lastBand) return lastBand;
  if (now - lastTransitionAt < META_ORCHESTRATION_HYSTERESIS_MS) return lastBand;
  lastBand = target;
  lastTransitionAt = now;
  return lastBand;
}

export function getMetaHysteresisBand(): 'healthy' | 'degraded' {
  return lastBand;
}
