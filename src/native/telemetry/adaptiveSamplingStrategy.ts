import type { NativeTelemetrySamplingMode } from '../../types/nativeDeviceTelemetry';
import type { ObserveNativeDeviceTelemetryInput } from '../../types/nativeDeviceTelemetry';
import {
  NATIVE_TELEMETRY_SAMPLE_BG_MS,
  NATIVE_TELEMETRY_SAMPLE_FG_MS,
  NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES,
} from '../../constants/nativeDeviceTelemetry';

let lastSampleAt = 0;

export function resetAdaptiveSamplingForTest(): void {
  lastSampleAt = 0;
}

export function resolveAdaptiveSamplingMode(
  input: ObserveNativeDeviceTelemetryInput,
): { mode: NativeTelemetrySamplingMode; intervalMs: number; shouldSample: boolean } {
  const now = Date.now();
  const thermal = input.metrics.thermalState;
  const bg = !input.performance.appForeground;

  if (NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES.includes(thermal as (typeof NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES)[number])) {
    return { mode: 'paused', intervalMs: 0, shouldSample: now - lastSampleAt >= 30_000 };
  }

  const intervalMs = bg ? NATIVE_TELEMETRY_SAMPLE_BG_MS : NATIVE_TELEMETRY_SAMPLE_FG_MS;
  const mode: NativeTelemetrySamplingMode = bg ? 'minimal' : 'full';
  const shouldSample = now - lastSampleAt >= intervalMs;
  if (shouldSample) lastSampleAt = now;
  return { mode, intervalMs, shouldSample };
}

export function markTelemetrySampled(): void {
  lastSampleAt = Date.now();
}
