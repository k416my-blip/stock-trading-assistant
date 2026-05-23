let lastHeartbeatAt = 0;
let lastGapWarningAt = 0;
let maxGapMs = 0;

export function resetRuntimeHeartbeatTrackerForTest(): void {
  lastHeartbeatAt = 0;
  lastGapWarningAt = 0;
  maxGapMs = 0;
}

export function noteRuntimeHeartbeat(at = Date.now()): void {
  if (lastHeartbeatAt > 0) {
    const gap = at - lastHeartbeatAt;
    if (gap > maxGapMs) maxGapMs = gap;
  }
  lastHeartbeatAt = at;
}

export function getHeartbeatAgeMs(now = Date.now()): number {
  if (lastHeartbeatAt <= 0) return 0;
  return Math.max(0, now - lastHeartbeatAt);
}

export function getMaxHeartbeatGapMs(): number {
  return maxGapMs;
}

export function shouldWarnHeartbeatGap(thresholdMs: number, now = Date.now()): boolean {
  const age = getHeartbeatAgeMs(now);
  if (age < thresholdMs) return false;
  if (now - lastGapWarningAt < 15_000) return false;
  lastGapWarningAt = now;
  return true;
}
