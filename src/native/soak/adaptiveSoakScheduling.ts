import type { SoakSchedulingMode } from '../../types/automatedSoakRunner';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';

export function resolveSoakSchedulingMode(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  screenOff: boolean,
): SoakSchedulingMode {
  const thermal = metrics.thermalState;
  if (thermal === 'severe' || thermal === 'critical' || thermal === 'emergency' || thermal === 'shutdown') {
    return 'thermal_throttled';
  }
  if (performance.batterySaverActive || metrics.native.batterySaverActive) {
    return 'battery_saver';
  }
  if (!performance.appForeground || screenOff) {
    return 'background_survival';
  }
  if (metrics.renderFPS < 14 || metrics.memoryTrendPct > 75) {
    return 'low_refresh';
  }
  return 'full';
}

export function soakTickIntervalMs(mode: SoakSchedulingMode): number {
  switch (mode) {
    case 'thermal_throttled':
      return 60_000;
    case 'battery_saver':
    case 'background_survival':
      return 45_000;
    case 'low_refresh':
      return 30_000;
    default:
      return 15_000;
  }
}
