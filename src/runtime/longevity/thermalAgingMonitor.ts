import type { NativeThermalStatus } from '../../types/runtimeTelemetry';
import { getThermalAuthority } from '../unified/thermalAuthorityLayer';

let agingAccum = 0;

export function resetThermalAgingForTest(): void {
  agingAccum = 0;
}

export function monitorThermalAging(status?: NativeThermalStatus): number {
  const s = status ?? getThermalAuthority();
  if (s === 'moderate') agingAccum += 0.02;
  if (s === 'severe' || s === 'critical') agingAccum += 0.08;
  else if (s === 'light') agingAccum += 0.005;
  else agingAccum = Math.max(0, agingAccum - 0.01);
  return Math.round(Math.min(1, agingAccum) * 1000) / 1000;
}
