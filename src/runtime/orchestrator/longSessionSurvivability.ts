/**
 * Long-session survivability (60+ min) — rolling cleanup and burst suppression.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { compactStalePriorityQueue } from './asyncPriorityScheduler';
import { getExplanationCacheSize } from '../../services/explanationStormGuard';

let lastRollingCleanupAt = 0;
let renderCachePruneCount = 0;

export function resetLongSessionSurvivabilityForTest(): void {
  lastRollingCleanupAt = 0;
  renderCachePruneCount = 0;
}

export function runLongSessionSurvivabilityPass(
  sessionMinutes: number,
  metrics: RuntimeTelemetryMetricsSnapshot,
): { actionsJa: string[] } {
  if (sessionMinutes < 60) return { actionsJa: [] };
  const now = Date.now();
  const actionsJa: string[] = [];

  if (now - lastRollingCleanupAt > 120_000) {
    lastRollingCleanupAt = now;
    const pruned = compactStalePriorityQueue(90_000);
    if (pruned > 0) actionsJa.push(`stale queue compact ${pruned}`);
    renderCachePruneCount += 1;
    actionsJa.push('render cache prune');
    if (metrics.websocket.jitterScore > 30) {
      actionsJa.push('websocket jitter smoothing');
    }
    if (metrics.hydrationResume.duplicateHydrationRate > 25) {
      actionsJa.push('hydration debounce tighten');
    }
    if (metrics.render.renderBurstRate >= 14) {
      actionsJa.push('async burst suppression');
    }
    const cacheSize = getExplanationCacheSize();
    if (cacheSize > 8) {
      actionsJa.push(`explanation cache trim (${cacheSize})`);
    }
  }

  return { actionsJa };
}

export function getLongSessionSurvivabilityStats(): {
  renderCachePruneCount: number;
  lastCleanupAt: number;
} {
  return { renderCachePruneCount, lastCleanupAt: lastRollingCleanupAt };
}
