import { getLatestRuntimeSnapshot, listRuntimeSnapshots } from './persistentRuntimeSnapshotCoordinator';

export function validateSnapshotRollback(targetId?: string): boolean {
  const snaps = listRuntimeSnapshots();
  if (snaps.length < 2) return false;
  const target = targetId ? snaps.find((s) => s.id === targetId) : snaps[snaps.length - 2];
  const latest = getLatestRuntimeSnapshot();
  return Boolean(target && latest && target.at <= latest.at);
}

export function resetSnapshotRollbackValidatorForTest(): void {
  /* stateless */
}
