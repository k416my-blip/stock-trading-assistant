import { JS_SCHEDULER_DRIFT_WARN_MS } from '../../constants/jsThreadSchedulerStabilization';

let lastExpectedAt = 0;
let intervalMs = 15_000;
let peakDrift = 0;

export function resetSchedulerDriftTrackerForTest(): void {
  lastExpectedAt = 0;
  intervalMs = 15_000;
  peakDrift = 0;
}

export function noteSchedulerTick(expectedIntervalMs: number, now = Date.now()): number {
  intervalMs = expectedIntervalMs;
  if (lastExpectedAt === 0) {
    lastExpectedAt = now;
    return 0;
  }
  const expected = lastExpectedAt + intervalMs;
  const drift = Math.abs(now - expected);
  peakDrift = Math.max(peakDrift, drift);
  lastExpectedAt = now;
  return drift;
}

export function getSchedulerDriftMs(): number {
  return peakDrift;
}

export function isSchedulerDriftElevated(): boolean {
  return peakDrift >= JS_SCHEDULER_DRIFT_WARN_MS;
}
