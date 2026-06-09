/**
 * 確信度%の内訳（actionGuide の computeConfidence と同じ減点ルール）
 */
import type { ConciergeSymbolActionGuide } from '../types/conciergeActionGuide';
import type { ConciergeConfidenceBreakdown, ConciergeSymbolEvidence } from '../types/conciergeEvidence';

function avgRounded(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function marketScoreParts(
  sym: ConciergeSymbolEvidence,
  scores: ConciergeSymbolActionGuide['evidenceScores'],
): number[] {
  const parts: number[] = [];
  if (sym.intradayChangePct != null) {
    parts.push(scores.priceAction, scores.volatility);
  }
  if (sym.volumeSurgeRatio != null) {
    parts.push(scores.volume);
  }
  return parts;
}

export function buildConfidencePointBreakdown(
  sym: ConciergeSymbolEvidence,
  guide: ConciergeSymbolActionGuide,
): ConciergeConfidenceBreakdown {
  const scores = guide.evidenceScores;
  const marketDataPts = avgRounded(marketScoreParts(sym, scores));
  const newsPts = sym.latestFinancialNews.length > 0 ? scores.news : 0;
  const xPts = sym.xSentiment?.postCount ? scores.xSentiment : 0;
  const dataGapPenalty = sym.dataGapsJa.length * 8 + (sym.quoteIsStale ? 12 : 0);

  return {
    marketDataPts,
    newsPts,
    xPts,
    dataGapPenalty,
    confidenceScore: guide.confidencePct,
  };
}
