import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function cleanAsyncFragmentation(metrics: RuntimeTelemetryMetricsSnapshot): {
  fragmentsCleared: number;
  pressureReduced: number;
} {
  const depth = metrics.asyncQueueDepth;
  if (depth < 16) return { fragmentsCleared: 0, pressureReduced: 0 };
  const fragmentsCleared = Math.min(8, Math.floor(depth / 12));
  const pressureReduced = Math.round(Math.min(0.3, fragmentsCleared / 20) * 1000) / 1000;
  return { fragmentsCleared, pressureReduced };
}
