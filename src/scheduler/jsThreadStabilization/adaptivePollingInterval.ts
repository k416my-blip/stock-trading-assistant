import type { JsSchedulerMode } from '../../types/jsThreadSchedulerStabilization';

export function resolveAdaptivePollingMs(mode: JsSchedulerMode, baseMs: number): number {
  switch (mode) {
    case 'screen_off':
      return baseMs * 4;
    case 'thermal_suppressed':
      return baseMs * 3;
    case 'freeze_safe':
      return baseMs * 2.5;
    case 'battery_lightweight':
    case 'background_degraded':
      return baseMs * 2;
    case 'low_refresh':
      return baseMs * 1.5;
    default:
      return baseMs;
  }
}
