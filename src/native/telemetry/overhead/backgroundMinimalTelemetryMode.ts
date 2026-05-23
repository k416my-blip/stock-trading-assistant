import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';

export function isBackgroundMinimalMode(appForeground: boolean, screenOff: boolean): boolean {
  return !appForeground || screenOff;
}

export function backgroundMinimalModeLabel(): TelemetryOverheadMode {
  return 'background_minimal';
}

export function shouldSuppressBackgroundWrites(appForeground: boolean): boolean {
  return !appForeground;
}
