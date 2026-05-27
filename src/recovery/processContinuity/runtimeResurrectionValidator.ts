import { getLatestRuntimeSnapshot } from './persistentRuntimeSnapshotCoordinator';

let lastConsistency = 1;

export function resetRuntimeResurrectionValidatorForTest(): void {
  lastConsistency = 1;
}

export function validateResurrection(snapshotHash?: string): number {
  const latest = getLatestRuntimeSnapshot();
  if (!latest) {
    lastConsistency = 0.85;
    return lastConsistency;
  }
  if (snapshotHash && snapshotHash !== latest.hash) {
    lastConsistency = 0.45;
    return lastConsistency;
  }
  lastConsistency = Math.min(1, 0.9 + latest.at / Date.now() * 0.01);
  return Math.round(lastConsistency * 1000) / 1000;
}

export function getResurrectionConsistency(): number {
  return lastConsistency;
}
