import type { BursaCompetitiveDimension, BursaPeerSnapshot } from '../../types/bursaDisclosure';
import { rankAmongPeers } from './bursaPeerComparison';

const OVERSEAS_KEYWORDS = [
  'international',
  'overseas',
  'global',
  'regional',
  'asean',
  'abroad',
  'cross-border',
  'worldwide',
  'foreign',
  'multi-country',
];

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

export function computeCompetitiveAdvantage(input: {
  targetCode: string;
  snapshots: BursaPeerSnapshot[];
  companyOverview: string | null;
}): {
  entryBarrier: BursaCompetitiveDimension;
  brandPower: BursaCompetitiveDimension;
  marketShare: BursaCompetitiveDimension;
  priceCompetitiveness: BursaCompetitiveDimension;
  overseasExpansion: BursaCompetitiveDimension;
} {
  const caps = input.snapshots
    .map((s) => ({ code: s.stockCode, cap: s.marketCap }))
    .filter((x) => x.cap != null && Number.isFinite(x.cap)) as { code: string; cap: number }[];

  const totalCap = caps.reduce((a, b) => a + b.cap, 0);
  const sortedCaps = [...caps].sort((a, b) => b.cap - a.cap);
  const top3Share = totalCap > 0 ? sortedCaps.slice(0, 3).reduce((a, b) => a + b.cap, 0) / totalCap : null;

  const entryBarrier: BursaCompetitiveDimension =
    top3Share != null
      ? {
          score: clampScore((top3Share / 0.75) * 100),
          reasonJa: `同業上位3社の時価総額シェア ${(top3Share * 100).toFixed(1)}%（KLSE 実データ）`,
        }
      : { score: null, reasonJa: 'データ未取得' };

  const capRank = rankAmongPeers(input.targetCode, input.snapshots, 'marketCap');
  const brandPower: BursaCompetitiveDimension =
    capRank.rank != null && capRank.peerCount > 0
      ? {
          score:
            capRank.peerCount === 1
              ? 100
              : clampScore(100 - ((capRank.rank - 1) / (capRank.peerCount - 1)) * 70),
          reasonJa: `同業時価総額 ${capRank.rank}位 / ${capRank.peerCount}社`,
        }
      : { score: null, reasonJa: 'データ未取得' };

  const targetCap = input.snapshots.find((s) => s.stockCode === input.targetCode)?.marketCap ?? null;
  const sharePct = targetCap != null && totalCap > 0 ? (targetCap / totalCap) * 100 : null;
  const maxSharePct =
    sortedCaps.length > 0 && totalCap > 0 ? (sortedCaps[0].cap / totalCap) * 100 : null;
  const marketShare: BursaCompetitiveDimension =
    sharePct != null && maxSharePct != null && maxSharePct > 0
      ? {
          score: clampScore((sharePct / maxSharePct) * 100),
          reasonJa: `時価総額シェア ${sharePct.toFixed(1)}%（同業 ${caps.length}社合計比）`,
        }
      : { score: null, reasonJa: 'データ未取得' };

  const targetPe = input.snapshots.find((s) => s.stockCode === input.targetCode)?.pe ?? null;
  const peRank = rankAmongPeers(input.targetCode, input.snapshots, 'pe');
  let priceCompetitiveness: BursaCompetitiveDimension = { score: null, reasonJa: 'データ未取得' };
  if (targetPe != null && peRank.rank != null && peRank.peerCount > 0) {
    const score =
      peRank.peerCount === 1
        ? 50
        : clampScore(((peRank.peerCount - peRank.rank + 1) / peRank.peerCount) * 100);
    const sorted = input.snapshots
      .map((s) => s.pe)
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    priceCompetitiveness = {
      score,
      reasonJa: `PER ${targetPe.toFixed(2)}倍 · 同業 ${peRank.rank}位/${peRank.peerCount}社（中央値 ${median.toFixed(2)}倍）`,
    };
  }

  const overview = (input.companyOverview ?? '').toLowerCase();
  const found = OVERSEAS_KEYWORDS.filter((kw) => overview.includes(kw));
  const overseasExpansion: BursaCompetitiveDimension =
    input.companyOverview?.trim()
      ? {
          score: clampScore(Math.min(100, found.length * 20)),
          reasonJa:
            found.length > 0
              ? `会社概要に海外関連語句: ${found.join(', ')}`
              : '会社概要に海外展開関連の記述なし',
        }
      : { score: null, reasonJa: 'データ未取得' };

  return {
    entryBarrier,
    brandPower,
    marketShare,
    priceCompetitiveness,
    overseasExpansion,
  };
}

export function averageCompetitiveScore(
  dims: ReturnType<typeof computeCompetitiveAdvantage>,
): number | null {
  const scores = [
    dims.entryBarrier.score,
    dims.brandPower.score,
    dims.marketShare.score,
    dims.priceCompetitiveness.score,
    dims.overseasExpansion.score,
  ].filter((v): v is number => v != null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
