import type { RnSurvivabilityMode } from '../../types/rnBridgeSurvivability';

export function shouldSuppressBridge(appForeground: boolean, screenOff: boolean): boolean {
  return !appForeground || screenOff;
}

export function resolveBackgroundBridgeMode(
  appForeground: boolean,
  screenOff: boolean,
): RnSurvivabilityMode | null {
  if (screenOff) return 'screen_off_suppressed';
  if (!appForeground) return 'background_suppressed';
  return null;
}
