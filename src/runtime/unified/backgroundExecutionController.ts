/** Background Execution Controller — minimal tick in background. */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';

export function isBackgroundMinimalTick(performance: PerformanceCostRuntimeSnapshot): boolean {
  return !performance.appForeground;
}
