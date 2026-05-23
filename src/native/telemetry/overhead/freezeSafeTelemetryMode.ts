import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';
import { SOAK_FREEZE_STALL_MS } from '../../../constants/automatedSoakRunner';

export function isFreezeSafeMode(jsStallMs: number): boolean {
  return jsStallMs >= SOAK_FREEZE_STALL_MS;
}

export function freezeSafeModeLabel(): TelemetryOverheadMode {
  return 'freeze_safe';
}
