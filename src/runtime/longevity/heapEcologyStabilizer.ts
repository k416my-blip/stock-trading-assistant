import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function stabilizeHeapEcology(
  metrics: RuntimeTelemetryMetricsSnapshot,
  sessionMinutes: number,
  liteMode: boolean,
): {
  heapEcology: number;
  youngPressure: number;
  zombieRatio: number;
} {
  const youngPressure = Math.min(1, metrics.memoryTrendPct / 100);
  const replayHeapRatio = Math.min(1, metrics.jsHeapEstimateMb / 256);
  const zombieRatio = Math.min(1, youngPressure * 0.4 + replayHeapRatio * 0.2);
  let heapEcology = 1 - youngPressure * 0.5 - zombieRatio * 0.3;
  if (liteMode && sessionMinutes >= 120) heapEcology = heapEcology * 0.85 + 0.1;
  return {
    heapEcology: Math.round(Math.max(0, Math.min(1, heapEcology)) * 1000) / 1000,
    youngPressure: Math.round(youngPressure * 1000) / 1000,
    zombieRatio: Math.round(zombieRatio * 1000) / 1000,
  };
}
