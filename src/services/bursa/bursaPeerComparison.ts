import type {
  BursaPeerMetricKey,
  BursaPeerSnapshot,
  BursaPhase3Analysis,
} from '../../types/bursaDisclosure';

const METRIC_LABELS: Record<BursaPeerMetricKey, string> = {
  marketCap: '時価総額',
  pe: 'PER',
  dividendYieldPct: '配当利回り',
  roePct: 'ROE',
  netProfit: '純利益',
  eps: 'EPS',
};

const LOWER_IS_BETTER: Set<BursaPeerMetricKey> = new Set(['pe']);

function metricValue(snap: BursaPeerSnapshot | null | undefined, key: BursaPeerMetricKey): number | null {
  if (!snap) return null;
  return snap[key] ?? null;
}

export function rankAmongPeers(
  targetCode: string,
  snapshots: BursaPeerSnapshot[],
  key: BursaPeerMetricKey,
): { rank: number | null; peerCount: number } {
  const valid = snapshots.filter((s) => {
    const v = metricValue(s, key);
    return v != null && Number.isFinite(v) && s.status !== 'failed';
  });
  if (valid.length === 0) return { rank: null, peerCount: 0 };

  const sorted = [...valid].sort((a, b) => {
    const av = metricValue(a, key)!;
    const bv = metricValue(b, key)!;
    return LOWER_IS_BETTER.has(key) ? av - bv : bv - av;
  });

  const idx = sorted.findIndex((s) => s.stockCode === targetCode);
  if (idx < 0) return { rank: null, peerCount: valid.length };
  return { rank: idx + 1, peerCount: valid.length };
}

export function buildPeerComparisonMetrics(
  targetCode: string,
  snapshots: BursaPeerSnapshot[],
): BursaPhase3Analysis['comparisonMetrics'] {
  const keys: BursaPeerMetricKey[] = [
    'marketCap',
    'pe',
    'dividendYieldPct',
    'roePct',
    'netProfit',
    'eps',
  ];

  return keys.map((metricKey) => {
    const { rank, peerCount } = rankAmongPeers(targetCode, snapshots, metricKey);
    const target = snapshots.find((s) => s.stockCode === targetCode);
    const valuesByCode: Record<string, number | null> = {};
    for (const s of snapshots) {
      valuesByCode[s.stockCode] = metricValue(s, metricKey);
    }
    return {
      metricKey,
      labelJa: METRIC_LABELS[metricKey],
      targetValue: target ? metricValue(target, metricKey) : null,
      targetRank: rank,
      peerCount,
      valuesByCode,
    };
  });
}

export function computeOverallIndustryRank(
  targetCode: string,
  snapshots: BursaPeerSnapshot[],
): number | null {
  const keys: BursaPeerMetricKey[] = ['marketCap', 'netProfit', 'dividendYieldPct', 'roePct'];
  const ranks: number[] = [];
  for (const key of keys) {
    const { rank } = rankAmongPeers(targetCode, snapshots, key);
    if (rank != null) ranks.push(rank);
  }
  if (ranks.length === 0) return null;
  return Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
}

export function countIndustryPeers(snapshots: BursaPeerSnapshot[]): number {
  return snapshots.filter(
    (s) => s.status !== 'failed' && s.marketCap != null && Number.isFinite(s.marketCap),
  ).length;
}

export function peerMedianPe(snapshots: BursaPeerSnapshot[]): number | null {
  const pes = snapshots
    .map((s) => s.pe)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (pes.length === 0) return null;
  const mid = Math.floor(pes.length / 2);
  return pes.length % 2 === 1 ? pes[mid] : (pes[mid - 1] + pes[mid]) / 2;
}
