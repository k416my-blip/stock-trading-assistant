import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';
import type { NativeThermalStatus } from '../../../types/runtimeTelemetry';
import { isFreezeSafeMode } from './freezeSafeTelemetryMode';
import { isThermalExportPaused } from './thermalSafeTelemetryMode';
import { isBackgroundMinimalMode } from './backgroundMinimalTelemetryMode';
import { resolveMemoryDegradedMode } from './memoryAwareTelemetryDegradation';

export type ThrottleInput = {
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  thermal: NativeThermalStatus;
  jsStallMs: number;
  memoryTrendPct: number;
  jsHeapMb: number;
};

export function resolveTelemetryThrottleMode(input: ThrottleInput): TelemetryOverheadMode {
  if (isFreezeSafeMode(input.jsStallMs)) return 'freeze_safe';
  if (isThermalExportPaused(input.thermal)) return 'thermal_pause';
  if (input.batterySaver) return 'battery_lightweight';
  if (isBackgroundMinimalMode(input.appForeground, input.screenOff)) return 'background_minimal';
  const mem = resolveMemoryDegradedMode(input.memoryTrendPct, input.jsHeapMb);
  if (mem) return mem;
  return 'full';
}

export function throttleIntervalMs(mode: TelemetryOverheadMode): number {
  switch (mode) {
    case 'freeze_safe':
    case 'thermal_pause':
      return 90_000;
    case 'background_minimal':
      return 60_000;
    case 'battery_lightweight':
      return 45_000;
    case 'memory_degraded':
      return 40_000;
    case 'low_refresh':
      return 30_000;
    default:
      return 15_000;
  }
}

export function shouldSkipHeavyTelemetry(mode: TelemetryOverheadMode): boolean {
  return mode !== 'full' && mode !== 'low_refresh';
}
