let attempts = 0;
let successes = 0;

export function resetPersistentReplayRecoveryForTest(): void {
  attempts = 0;
  successes = 0;
}

export function runPersistentReplayRecovery(toleranceOk: boolean): number {
  attempts += 1;
  if (toleranceOk) successes += 1;
  if (attempts === 0) return 1;
  return Math.round((successes / attempts) * 100) / 100;
}

export function getReplayRecoverySuccess(): number {
  if (attempts === 0) return 1;
  return Math.round((successes / attempts) * 100) / 100;
}
