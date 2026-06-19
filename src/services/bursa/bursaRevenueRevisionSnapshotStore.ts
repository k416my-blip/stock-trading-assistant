/**
 * Phase23 — Revenue estimate snapshot store (推測禁止)
 * 同一 fiscal period の revenue コンセンサスを時系列保存し、30日前スナップショットから修正率を算出。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export type RevenueEstimateSnapshot = {
  stockCode: string;
  fiscalPeriodEnd: string;
  revenueEstimate: number;
  source: string;
  observedAt: string;
};

type SnapshotStoreFile = {
  version: 1;
  snapshots: RevenueEstimateSnapshot[];
};

const MAX_SNAPSHOTS_PER_KEY = 48;
const DEFAULT_SNAPSHOT_PATH = join(
  process.cwd(),
  'docs/review/evidence/phase23-revenue-revision-snapshots.json',
);

let memoryStore: RevenueEstimateSnapshot[] = [];
let snapshotPath = DEFAULT_SNAPSHOT_PATH;

function normalizeCode(stockCode: string): string {
  return stockCode.replace(/\.KL$/i, '').trim();
}

function snapshotKey(stockCode: string, fiscalPeriodEnd: string): string {
  return `${normalizeCode(stockCode)}|${fiscalPeriodEnd}`;
}

function loadFileStore(path: string): RevenueEstimateSnapshot[] {
  if (typeof process === 'undefined' || !existsSync(path)) return [];
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
  if (typeof process === 'undefined') return;
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
  if (typeof process !== 'undefined' && existsSync(snapshotPath)) {
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
  if (memoryStore.length === 0 && typeof process !== 'undefined') {
    memoryStore = loadFileStore(snapshotPath);
  }
  return [...memoryStore];
}

export function recordRevenueEstimateSnapshot(input: RevenueEstimateSnapshot): void {
  if (!Number.isFinite(input.revenueEstimate) || input.revenueEstimate === 0) return;
  if (memoryStore.length === 0 && typeof process !== 'undefined') {
    memoryStore = loadFileStore(snapshotPath);
  }

  const key = snapshotKey(input.stockCode, input.fiscalPeriodEnd);
  const observedAtMs = Date.parse(input.observedAt);
  const deduped = memoryStore.filter(
    (s) =>
      !(
        snapshotKey(s.stockCode, s.fiscalPeriodEnd) === key &&
        Math.abs(Date.parse(s.observedAt) - observedAtMs) < 60 * 60 * 1000
      ),
  );

  deduped.push(input);
  deduped.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  const byKey = new Map<string, RevenueEstimateSnapshot[]>();
  for (const snap of deduped) {
    const k = snapshotKey(snap.stockCode, snap.fiscalPeriodEnd);
    const list = byKey.get(k) ?? [];
    list.push(snap);
    byKey.set(k, list);
  }

  const trimmed: RevenueEstimateSnapshot[] = [];
  for (const list of byKey.values()) {
    trimmed.push(...list.slice(-MAX_SNAPSHOTS_PER_KEY));
  }
  trimmed.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  memoryStore = trimmed;
  persistFileStore(snapshotPath, memoryStore);
}

export function findRevenueEstimateSnapshotNearDaysAgo(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  daysAgo: number;
  toleranceDays?: number;
}): RevenueEstimateSnapshot | null {
  const snapshots = listRevenueEstimateSnapshots().filter(
    (s) =>
      snapshotKey(s.stockCode, s.fiscalPeriodEnd) ===
      snapshotKey(input.stockCode, input.fiscalPeriodEnd),
  );
  if (snapshots.length === 0) return null;

  const now = Date.now();
  const targetMs = now - input.daysAgo * 24 * 60 * 60 * 1000;
  const toleranceMs = (input.toleranceDays ?? 10) * 24 * 60 * 60 * 1000;

  let best: RevenueEstimateSnapshot | null = null;
  let bestDelta = Infinity;
  for (const snap of snapshots) {
    const t = Date.parse(snap.observedAt);
    if (!Number.isFinite(t) || t >= now - 2 * 24 * 60 * 60 * 1000) continue;
    const delta = Math.abs(t - targetMs);
    if (delta <= toleranceMs && delta < bestDelta) {
      best = snap;
      bestDelta = delta;
    }
  }
  return best;
}

export function computeRevisionPctFromSnapshots(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  currentRevenue: number;
  daysAgo?: number;
}): { revision30d: number | null; priorSnapshot: RevenueEstimateSnapshot | null } {
  const prior = findRevenueEstimateSnapshotNearDaysAgo({
    stockCode: input.stockCode,
    fiscalPeriodEnd: input.fiscalPeriodEnd,
    daysAgo: input.daysAgo ?? 30,
  });
  if (!prior || prior.revenueEstimate === 0) {
    return { revision30d: null, priorSnapshot: null };
  }
  const revision30d = ((input.currentRevenue - prior.revenueEstimate) / Math.abs(prior.revenueEstimate)) * 100;
  return {
    revision30d: Number.isFinite(revision30d) ? revision30d : null,
    priorSnapshot: prior,
  };
}
