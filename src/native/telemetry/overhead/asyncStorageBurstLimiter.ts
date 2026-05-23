import {
  TELEMETRY_ASYNC_STORAGE_BURST_MAX,
  TELEMETRY_ASYNC_STORAGE_BURST_WINDOW_MS,
} from '../../../constants/telemetryOverhead';

const writes: number[] = [];

export function resetAsyncStorageBurstLimiterForTest(): void {
  writes.length = 0;
}

export function noteAsyncStorageWrite(now = Date.now()): void {
  writes.push(now);
  const cutoff = now - TELEMETRY_ASYNC_STORAGE_BURST_WINDOW_MS;
  while (writes.length > 0 && writes[0] < cutoff) writes.shift();
}

export function canAsyncStorageWrite(now = Date.now()): boolean {
  const cutoff = now - TELEMETRY_ASYNC_STORAGE_BURST_WINDOW_MS;
  const recent = writes.filter((t) => t >= cutoff).length;
  return recent < TELEMETRY_ASYNC_STORAGE_BURST_MAX;
}

export function asyncStoragePressure(): number {
  return Math.min(1, writes.length / TELEMETRY_ASYNC_STORAGE_BURST_MAX);
}
