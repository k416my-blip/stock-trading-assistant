import type { ThermalStateTrackerSnapshot } from '../../types/nativeDeviceTelemetry';
import type { NativeThermalStatus } from '../../types/runtimeTelemetry';
import { NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES } from '../../constants/nativeDeviceTelemetry';

let severeSince: number | null = null;
let lastStatus: NativeThermalStatus = 'none';

export function resetThermalStateTrackerForTest(): void {
  severeSince = null;
  lastStatus = 'none';
}

export function observeThermalState(status: NativeThermalStatus): ThermalStateTrackerSnapshot {
  const severe = NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES.includes(
    status as (typeof NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES)[number],
  );
  if (severe) {
    if (severeSince == null || lastStatus !== status) severeSince = Date.now();
  } else {
    severeSince = null;
  }
  lastStatus = status;
  const severeDurationSec =
    severeSince != null ? Math.round((Date.now() - severeSince) / 1000) : 0;
  return {
    thermalStatus: status,
    severeDurationSec,
    throttlingDetected: severe || status === 'moderate',
  };
}
