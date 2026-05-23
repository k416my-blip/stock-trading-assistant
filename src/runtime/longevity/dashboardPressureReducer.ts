import { DASHBOARD_RING_CAP } from '../../constants/runtimeLongevity';

export function reduceDashboardPressure(input: {
  sessionMinutes: number;
  asyncQueueDepth: number;
  compressStrong: boolean;
}): { thinned: boolean; ringCap: number } {
  const throttled = input.asyncQueueDepth > 48;
  const compress = input.compressStrong || input.sessionMinutes >= 180;
  return {
    thinned: throttled || compress,
    ringCap: compress ? Math.floor(DASHBOARD_RING_CAP / 2) : DASHBOARD_RING_CAP,
  };
}
