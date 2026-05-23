/** Thermal Authority Layer — single thermal truth for all layers. */
import type { NativeThermalStatus } from '../../types/runtimeTelemetry';

let authorityThermal: NativeThermalStatus = 'none';

export function resetThermalAuthorityForTest(): void {
  authorityThermal = 'none';
}

export function setThermalAuthority(status: NativeThermalStatus): NativeThermalStatus {
  authorityThermal = status;
  return authorityThermal;
}

export function getThermalAuthority(): NativeThermalStatus {
  return authorityThermal;
}

export function isThermalSevere(): boolean {
  return authorityThermal === 'severe' || authorityThermal === 'critical' || authorityThermal === 'emergency';
}
