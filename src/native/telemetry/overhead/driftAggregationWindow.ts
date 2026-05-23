import { TELEMETRY_DRIFT_WINDOW_MS } from '../../../constants/telemetryOverhead';

const window: Array<{ at: number; jsHeapMb: number; replayCount: number }> = [];

export function resetDriftAggregationWindowForTest(): void {
  window.length = 0;
}

export function noteDriftSample(jsHeapMb: number, replayCount: number, now = Date.now()): void {
  window.push({ at: now, jsHeapMb, replayCount });
  const cutoff = now - TELEMETRY_DRIFT_WINDOW_MS;
  while (window.length > 0 && window[0].at < cutoff) window.shift();
}

export function aggregateDriftPerHour(): { memoryMbPerHour: number; replayPerHour: number; telemetryDrift: number } {
  if (window.length < 2) return { memoryMbPerHour: 0, replayPerHour: 0, telemetryDrift: 0 };
  const first = window[0];
  const last = window.at(-1)!;
  const hours = Math.max(0.01, (last.at - first.at) / 3_600_000);
  const memoryMbPerHour = (last.jsHeapMb - first.jsHeapMb) / hours;
  const replayPerHour = (last.replayCount - first.replayCount) / hours;
  const telemetryDrift = Math.abs(memoryMbPerHour) * 0.6 + Math.abs(replayPerHour) * 0.4;
  return {
    memoryMbPerHour: Math.round(memoryMbPerHour * 10) / 10,
    replayPerHour: Math.round(replayPerHour * 10) / 10,
    telemetryDrift: Math.round(telemetryDrift * 100) / 100,
  };
}
