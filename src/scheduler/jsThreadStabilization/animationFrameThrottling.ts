let lastFrameAt = 0;
let minIntervalMs = 16;

export function resetAnimationFrameThrottlingForTest(): void {
  lastFrameAt = 0;
  minIntervalMs = 16;
}

export function setAnimationMinIntervalMs(ms: number): void {
  minIntervalMs = Math.max(33, ms);
}

export function shouldThrottleAnimationFrame(now = Date.now()): boolean {
  if (now - lastFrameAt < minIntervalMs) return true;
  lastFrameAt = now;
  return false;
}

export function degradeFrameObserver(): void {
  minIntervalMs = 48;
}
