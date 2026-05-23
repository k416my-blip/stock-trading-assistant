import type { TickDurationHistogramSnapshot } from '../../types/nativeDeviceTelemetry';
import { NATIVE_TELEMETRY_TICK_HISTOGRAM_MAX } from '../../constants/nativeDeviceTelemetry';

const durations: number[] = [];

export function resetTickDurationHistogramForTest(): void {
  durations.length = 0;
}

export function noteTickDurationMs(ms: number): void {
  if (ms <= 0 || !Number.isFinite(ms)) return;
  durations.push(ms);
  if (durations.length > NATIVE_TELEMETRY_TICK_HISTOGRAM_MAX) durations.shift();
}

export function observeTickDurationHistogram(): TickDurationHistogramSnapshot {
  if (durations.length === 0) {
    return { averageMs: 0, maxMs: 0, p95Ms: 0, sampleCount: 0 };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    averageMs: Math.round(sum / sorted.length),
    maxMs: sorted.at(-1) ?? 0,
    p95Ms: sorted[p95Idx] ?? 0,
    sampleCount: sorted.length,
  };
}
