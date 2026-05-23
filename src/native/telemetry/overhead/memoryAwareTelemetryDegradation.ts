import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';

export function resolveMemoryDegradedMode(memoryTrendPct: number, jsHeapMb: number): TelemetryOverheadMode | null {
  if (memoryTrendPct > 85 || jsHeapMb > 220) return 'memory_degraded';
  if (memoryTrendPct > 70 || jsHeapMb > 180) return 'low_refresh';
  return null;
}
