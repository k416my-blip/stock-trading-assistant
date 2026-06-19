/** Shared snapshot store logic — no Node fs (safe for RN bundle). */

export type RevenueEstimateSnapshot = {
  stockCode: string;
  fiscalPeriodEnd: string;
  revenueEstimate: number;
  source: string;
  observedAt: string;
};

export const MAX_SNAPSHOTS_PER_KEY = 48;

export function normalizeCode(stockCode: string): string {
  return stockCode.replace(/\.KL$/i, '').trim();
}

export function snapshotKey(stockCode: string, fiscalPeriodEnd: string): string {
  return `${normalizeCode(stockCode)}|${fiscalPeriodEnd}`;
}

export function mergeSnapshotRecord(
  memoryStore: RevenueEstimateSnapshot[],
  input: RevenueEstimateSnapshot,
): RevenueEstimateSnapshot[] {
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
  return trimmed;
}

export function findRevenueEstimateSnapshotNearDaysAgo(
  snapshots: RevenueEstimateSnapshot[],
  input: {
    stockCode: string;
    fiscalPeriodEnd: string;
    daysAgo: number;
    toleranceDays?: number;
  },
): RevenueEstimateSnapshot | null {
  const filtered = snapshots.filter(
    (s) =>
      snapshotKey(s.stockCode, s.fiscalPeriodEnd) ===
      snapshotKey(input.stockCode, input.fiscalPeriodEnd),
  );
  if (filtered.length === 0) return null;

  const now = Date.now();
  const targetMs = now - input.daysAgo * 24 * 60 * 60 * 1000;
  const toleranceMs = (input.toleranceDays ?? 10) * 24 * 60 * 60 * 1000;

  let best: RevenueEstimateSnapshot | null = null;
  let bestDelta = Infinity;
  for (const snap of filtered) {
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

export function computeRevisionPctFromSnapshots(
  snapshots: RevenueEstimateSnapshot[],
  input: {
    stockCode: string;
    fiscalPeriodEnd: string;
    currentRevenue: number;
    daysAgo?: number;
  },
): { revision30d: number | null; priorSnapshot: RevenueEstimateSnapshot | null } {
  const prior = findRevenueEstimateSnapshotNearDaysAgo(snapshots, {
    stockCode: input.stockCode,
    fiscalPeriodEnd: input.fiscalPeriodEnd,
    daysAgo: input.daysAgo ?? 30,
  });
  if (!prior || prior.revenueEstimate === 0) {
    return { revision30d: null, priorSnapshot: null };
  }
  const revision30d =
    ((input.currentRevenue - prior.revenueEstimate) / Math.abs(prior.revenueEstimate)) * 100;
  return {
    revision30d: Number.isFinite(revision30d) ? revision30d : null,
    priorSnapshot: prior,
  };
}
