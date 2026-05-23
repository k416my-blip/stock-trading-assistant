let lastInteractionAt = Date.now();

export function resetInteractionAwareSchedulingForTest(): void {
  lastInteractionAt = Date.now();
}

export function noteSchedulerUserInteraction(now = Date.now()): void {
  lastInteractionAt = now;
}

export function msSinceLastInteraction(now = Date.now()): number {
  return now - lastInteractionAt;
}

export function shouldDeferNonCriticalWork(now = Date.now(), idleThresholdMs = 3_000): boolean {
  return now - lastInteractionAt < idleThresholdMs;
}
