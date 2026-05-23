import { RN_SNAPSHOT_POOL_MAX } from '../../constants/rnBridgeSurvivability';

const pool: object[] = [];

export function resetSnapshotObjectPoolForTest(): void {
  pool.length = 0;
}

export function acquireSnapshotObject<T extends object>(factory: () => T): T {
  const recycled = pool.pop();
  if (recycled) return recycled as T;
  return factory();
}

export function releaseSnapshotObject(obj: object): void {
  if (pool.length >= RN_SNAPSHOT_POOL_MAX) return;
  pool.push(obj);
}

export function snapshotPoolSize(): number {
  return pool.length;
}
