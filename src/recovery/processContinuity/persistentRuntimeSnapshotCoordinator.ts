type Snapshot = { id: string; at: number; hash: string; immutable: boolean };

const snapshots: Snapshot[] = [];
let rotateIndex = 0;

export function resetPersistentRuntimeSnapshotCoordinatorForTest(): void {
  snapshots.length = 0;
  rotateIndex = 0;
}

export function commitRuntimeSnapshot(id: string, hash: string, now = Date.now()): void {
  const snap: Snapshot = { id, at: now, hash, immutable: true };
  snapshots.push(snap);
  if (snapshots.length > 8) snapshots.shift();
  rotateIndex = snapshots.length - 1;
}

export function getLatestRuntimeSnapshot(): Snapshot | null {
  return snapshots.length ? snapshots[snapshots.length - 1] : null;
}

export function getSnapshotRotationIndex(): number {
  return rotateIndex;
}

export function listRuntimeSnapshots(): readonly Snapshot[] {
  return snapshots;
}
