import type { JsThreadStabilizationProfile } from '../../types/jsThreadSchedulerStabilization';

export function computeJsThreadSurvivalScore(partial: {
  eventLoopLagMs: number;
  schedulerDriftMs: number;
  gcSpikeMs: number;
  jsFramePressure: number;
  callbackDensity: number;
}): number {
  let score = 100;
  if (partial.eventLoopLagMs > 400) score -= 25;
  else if (partial.eventLoopLagMs > 200) score -= 12;
  if (partial.schedulerDriftMs > 300) score -= 20;
  else if (partial.schedulerDriftMs > 120) score -= 10;
  if (partial.gcSpikeMs > 8) score -= 10;
  if (partial.jsFramePressure > 0.8) score -= 15;
  if (partial.callbackDensity > 0.85) score -= 12;
  return Math.max(0, Math.min(100, score));
}

export function attachSurvivalScore(
  profile: Omit<JsThreadStabilizationProfile, 'survivalScore'>,
): JsThreadStabilizationProfile {
  return {
    ...profile,
    survivalScore: computeJsThreadSurvivalScore(profile),
  };
}
