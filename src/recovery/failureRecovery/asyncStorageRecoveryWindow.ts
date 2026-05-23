let windowOpenUntil = 0;
let deferredWrites = 0;

export function resetAsyncStorageRecoveryWindowForTest(): void {
  windowOpenUntil = 0;
  deferredWrites = 0;
}

export function openAsyncStorageRecoveryWindow(now = Date.now(), durationMs = 30_000): void {
  windowOpenUntil = now + durationMs;
}

export function shouldDeferRecoveryFlush(now = Date.now()): boolean {
  return now < windowOpenUntil;
}

export function noteDeferredAsyncWrite(): void {
  deferredWrites += 1;
}

export function flushRecoveryWindow(now = Date.now()): boolean {
  if (now < windowOpenUntil) return false;
  deferredWrites = 0;
  return true;
}

export function getDeferredWriteCount(): number {
  return deferredWrites;
}
