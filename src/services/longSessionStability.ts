import { LONG_SESSION_MINUTES } from '../constants/crossLayerCascade';
import type { CascadeSuppressionActions } from '../types/crossLayerCascade';

let sessionStartedAt = Date.now();

export function resetLongSessionStabilityForTest(startedAt = Date.now()): void {
  sessionStartedAt = startedAt;
}

export function markSessionStart(now = Date.now()): void {
  sessionStartedAt = now;
}

export function getSessionMinutes(now = Date.now()): number {
  return Math.max(0, (now - sessionStartedAt) / 60_000);
}

export function isLongSessionActive(now = Date.now()): boolean {
  return getSessionMinutes(now) >= LONG_SESSION_MINUTES;
}

export function applyLongSessionStabilityActions(
  base: CascadeSuppressionActions,
): CascadeSuppressionActions {
  if (!isLongSessionActive()) return base;
  return {
    ...base,
    longSessionLightweightFallback: true,
    memoryGraphPruning: true,
    explanationCacheCompaction: true,
    websocketIdleDowngrade: true,
    orchestrationSimplification: true,
    dashboardRefreshIntervalIncrease: true,
    explanationThrottling: true,
    minimalDashboardRendering: base.minimalDashboardRendering || getSessionMinutes() >= 45,
  };
}
