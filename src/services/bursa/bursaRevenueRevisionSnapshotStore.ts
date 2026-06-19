/**
 * Phase23 — Revenue estimate snapshot store (Node · fs persistence)
 * Metro on native resolves `bursaRevenueRevisionSnapshotStore.native.ts` instead.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  computeRevisionPctFromSnapshots as computeFromList,
  findRevenueEstimateSnapshotNearDaysAgo as findNearDaysAgo,
  mergeSnapshotRecord,
  type RevenueEstimateSnapshot,
} from './bursaRevenueRevisionSnapshotStore.shared';

export type { RevenueEstimateSnapshot };

type SnapshotStoreFile = {
  version: 1;
  snapshots: RevenueEstimateSnapshot[];
};

const DEFAULT_SNAPSHOT_PATH = join(
  process.cwd(),
  'docs/review/evidence/phase23-revenue-revision-snapshots.json',
);

let memoryStore: RevenueEstimateSnapshot[] = [];
let snapshotPath = DEFAULT_SNAPSHOT_PATH;

function loadFileStore(path: string): RevenueEstimateSnapshot[] {
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as SnapshotStoreFile;
    if (parsed?.version !== 1 || !Array.isArray(parsed.snapshots)) return [];
    return parsed.snapshots;
  } catch {
    return [];
  }
}

function persistFileStore(path: string, snapshots: RevenueEstimateSnapshot[]): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const payload: SnapshotStoreFile = { version: 1, snapshots };
    writeFileSync(path, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // 書き込み失敗時は in-memory のみ継続
  }
}

export function configureRevenueRevisionSnapshotPath(path: string | null): void {
  snapshotPath = path ?? DEFAULT_SNAPSHOT_PATH;
  memoryStore = loadFileStore(snapshotPath);
}

export function resetRevenueRevisionSnapshotStoreForTest(): void {
  memoryStore = [];
  if (existsSync(snapshotPath)) {
    try {
      writeFileSync(snapshotPath, JSON.stringify({ version: 1, snapshots: [] }, null, 2), 'utf8');
    } catch {
      // ignore
    }
  }
}

export function configureRevenueRevisionSnapshotPathForTest(path: string): void {
  snapshotPath = path;
  memoryStore = [];
}

export function listRevenueEstimateSnapshots(): RevenueEstimateSnapshot[] {
  if (memoryStore.length === 0) {
    memoryStore = loadFileStore(snapshotPath);
  }
  return [...memoryStore];
}

export function recordRevenueEstimateSnapshot(input: RevenueEstimateSnapshot): void {
  if (!Number.isFinite(input.revenueEstimate) || input.revenueEstimate === 0) return;
  if (memoryStore.length === 0) {
    memoryStore = loadFileStore(snapshotPath);
  }
  memoryStore = mergeSnapshotRecord(memoryStore, input);
  persistFileStore(snapshotPath, memoryStore);
}

export function findRevenueEstimateSnapshotNearDaysAgo(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  daysAgo: number;
  toleranceDays?: number;
}): RevenueEstimateSnapshot | null {
  return findNearDaysAgo(listRevenueEstimateSnapshots(), input);
}

export function computeRevisionPctFromSnapshots(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  currentRevenue: number;
  daysAgo?: number;
}): { revision30d: number | null; priorSnapshot: RevenueEstimateSnapshot | null } {
  return computeFromList(listRevenueEstimateSnapshots(), input);
}
