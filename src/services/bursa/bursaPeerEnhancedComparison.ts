import type {
  BursaEnhancedPeerComparison,
  BursaEnhancedPeerMetricKey,
  BursaPeerSnapshot,
} from '../../types/bursaDisclosure';

const METRIC_LABELS: Record<BursaEnhancedPeerMetricKey, string> = {
  revenue: '売上',
  netProfit: '純利益',
  eps: 'EPS',
  roePct: 'ROE',
  dividendYieldPct: '配当利回り',
};

function peerAverage(
  snapshots: BursaPeerSnapshot[],
  extractor: (s: BursaPeerSnapshot) => number | null,
): number | null {
  const vals = snapshots
    .filter((s) => s.status !== 'failed')
    .map(extractor)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function relativeDiffPct(target: number | null, avg: number | null): number | null {
  if (target == null || avg == null || !Number.isFinite(target) || !Number.isFinite(avg)) {
    return null;
  }
  if (avg === 0) return null;
  return ((target - avg) / Math.abs(avg)) * 100;
}

export function buildEnhancedPeerComparison(
  targetCode: string,
  snapshots: BursaPeerSnapshot[],
): BursaEnhancedPeerComparison[] {
  const target = snapshots.find((s) => s.stockCode === targetCode);
  const keys: BursaEnhancedPeerMetricKey[] = [
    'revenue',
    'netProfit',
    'eps',
    'roePct',
    'dividendYieldPct',
  ];

  return keys.map((metricKey) => {
    const targetValue = target?.[metricKey] ?? null;
    const industryAverage = peerAverage(snapshots, (s) => s[metricKey]);
    return {
      metricKey,
      labelJa: METRIC_LABELS[metricKey],
      targetValue,
      industryAverage,
      diffPct: relativeDiffPct(targetValue, industryAverage),
    };
  });
}
