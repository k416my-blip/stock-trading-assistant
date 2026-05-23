let quarantineStartedAt = 0;
let quarantineDurationMs = 0;

export function resetRuntimeQuarantineModeForTest(): void {
  quarantineStartedAt = 0;
  quarantineDurationMs = 0;
}

export function enterRuntimeQuarantine(now = Date.now()): void {
  if (!quarantineStartedAt) quarantineStartedAt = now;
}

export function exitRuntimeQuarantine(now = Date.now()): void {
  if (quarantineStartedAt) {
    quarantineDurationMs += now - quarantineStartedAt;
    quarantineStartedAt = 0;
  }
}

export function getRuntimeQuarantineDuration(): number {
  const active = quarantineStartedAt ? Date.now() - quarantineStartedAt : 0;
  return quarantineDurationMs + active;
}

export function isQuarantineActive(): boolean {
  return quarantineStartedAt > 0;
}

export function buildQuarantineSnapshot(): Record<string, unknown> {
  return {
    active: isQuarantineActive(),
    durationMs: getRuntimeQuarantineDuration(),
    startedAt: quarantineStartedAt ? new Date(quarantineStartedAt).toISOString() : null,
  };
}
