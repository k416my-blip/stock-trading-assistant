import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

let lastLevel: RuntimeTelemetryMetricsSnapshot['thermalState'] = 'none';
let throttleActive = false;

export function resetRuntimeThermalTrackerForTest(): void {
  lastLevel = 'none';
  throttleActive = false;
}

export function observeThermalLevel(level: RuntimeTelemetryMetricsSnapshot['thermalState']): void {
  lastLevel = level;
  throttleActive = level === 'severe' || level === 'critical';
}

export function getThermalLevel(): RuntimeTelemetryMetricsSnapshot['thermalState'] {
  return lastLevel;
}

export function isThermalThrottling(): boolean {
  return throttleActive;
}
