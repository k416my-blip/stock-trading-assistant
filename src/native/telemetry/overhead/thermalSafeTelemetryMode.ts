import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';
import type { NativeThermalStatus } from '../../../types/runtimeTelemetry';
import { NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES } from '../../../constants/nativeDeviceTelemetry';

export function isThermalExportPaused(thermal: NativeThermalStatus): boolean {
  return NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES.includes(
    thermal as (typeof NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES)[number],
  );
}

export function thermalSafeModeLabel(): TelemetryOverheadMode {
  return 'thermal_pause';
}
