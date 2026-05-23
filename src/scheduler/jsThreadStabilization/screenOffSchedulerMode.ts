import type { JsSchedulerMode } from '../../types/jsThreadSchedulerStabilization';

export function resolveScreenOffMode(screenOff: boolean): JsSchedulerMode | null {
  return screenOff ? 'screen_off' : null;
}

export function screenOffTimerReductionFactor(): number {
  return 4;
}
