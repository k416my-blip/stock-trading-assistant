/**
 * Bursa Phase 6 — 銘柄発掘（ランキング・ポートフォリオ・買い替え提案）
 */
import type { PortfolioPosition } from '../../types';
import type {
  BursaDisclosureBundle,
  BursaPhase6Analysis,
  BursaPhase6HoldingComparison,
  BursaPhase6PortfolioSuggestion,
  BursaPhase6RankedEntry,
  BursaPhase6ReplacementSuggestion,
} from '../../types/bursaDisclosure';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import { peerSnapshotFromBundle } from './bursaPeerSnapshotService';
import {
  matchesBeginnerStyle,
  scoreBursaStock,
  styleSortKey,
  type BursaScoredStock,
} from './bursaPhase6Scoring';
import {
  BURSA_INVESTMENT_STYLES,
  BURSA_PORTFOLIO_BUDGETS_MYR,
  getBursaUniverseStockCodes,
  type BursaInvestmentStyleId,
} from './bursaStockUniverse';

const TOP_N = 100;
const STYLE_TOP_N = 30;
const PORTFOLIO_PICK_COUNT = 5;
const BURSA_LOT_SIZE = 100;

function toRankedEntry(stock: BursaScoredStock, rank: number): BursaPhase6RankedEntry {
  return {
    stockCode: stock.stockCode,
    companyName: stock.companyName,
    sector: stock.sector,
    rank,
    compositeScore: stock.compositeScore,
    growth: stock.breakdown.growth,
    profitability: stock.breakdown.profitability,
    stability: stock.breakdown.stability,
    value: stock.breakdown.value,
    dividendAppeal: stock.breakdown.dividendAppeal,
    competitiveAdvantage: stock.breakdown.competitiveAdvantage,
    dividendYieldPct: stock.dividendYieldPct,
    marketCap: stock.marketCap,
    currentPrice: stock.currentPrice,
    dataStatus: stock.dataStatus,
  };
}

function sortByStyle(stocks: BursaScoredStock[], style: BursaInvestmentStyleId): BursaScoredStock[] {
  return [...stocks]
    .filter((s) => {
      if (s.compositeScore == null) return false;
      if (style === 'beginner') return matchesBeginnerStyle(s);
      return styleSortKey(style, s) != null;
    })
    .sort((a, b) => (styleSortKey(style, b) ?? 0) - (styleSortKey(style, a) ?? 0));
}

function diversifyBySector(stocks: BursaScoredStock[], count: number): BursaScoredStock[] {
  const picked: BursaScoredStock[] = [];
  for (const s of stocks) {
    if (picked.length >= count) break;
    const sec = s.sector ?? 'unknown';
    const sameSector = picked.filter((p) => (p.sector ?? 'unknown') === sec).length;
    if (sameSector >= 2) continue;
    picked.push(s);
  }
  if (picked.length < count) {
    for (const s of stocks) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.stockCode === s.stockCode)) picked.push(s);
    }
  }
  return picked;
}

function buildPortfolioSuggestion(
  budgetMYR: number,
  ranked: BursaScoredStock[],
): BursaPhase6PortfolioSuggestion {
  const eligible = ranked.filter(
    (s) => s.compositeScore != null && s.currentPrice != null && s.currentPrice > 0,
  );
  const picked = diversifyBySector(eligible, PORTFOLIO_PICK_COUNT);
  const scoreSum = picked.reduce((a, s) => a + (s.compositeScore ?? 0), 0);

  const rows = picked.map((s) => {
    const weight = scoreSum > 0 ? (s.compositeScore ?? 0) / scoreSum : 1 / picked.length;
    const allocationMYR = Math.round(budgetMYR * weight);
    const lotCost = (s.currentPrice ?? 0) * BURSA_LOT_SIZE;
    const lots = lotCost > 0 ? Math.floor(allocationMYR / lotCost) : 0;
    return {
      stockCode: s.stockCode,
      companyName: s.companyName,
      allocationMYR,
      allocationPct: Math.round(weight * 1000) / 10,
      sharesApprox: lots > 0 ? lots * BURSA_LOT_SIZE : null,
      currentPrice: s.currentPrice,
    };
  });

  return { budgetMYR, rows };
}

function buildHoldingComparisons(
  holdings: PortfolioPosition[],
  ranked: BursaPhase6RankedEntry[],
): BursaPhase6HoldingComparison[] {
  const top100 = ranked.slice(0, TOP_N);
  const withScore = top100.filter((r) => r.compositeScore != null);
  const avgScore =
    withScore.length > 0
      ? withScore.reduce((a, r) => a + (r.compositeScore ?? 0), 0) / withScore.length
      : null;

  return holdings
    .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
    .map((h) => {
      const code = h.symbol.replace(/\.KL$/i, '').trim();
      const entry = ranked.find((r) => r.stockCode === code);
      const holdingScore = entry?.compositeScore ?? null;
      const holdingRank = entry?.rank ?? null;
      let vsTopAvgPct: number | null = null;
      if (holdingScore != null && avgScore != null && avgScore > 0) {
        vsTopAvgPct = ((holdingScore - avgScore) / avgScore) * 100;
      }
      return {
        symbol: code,
        companyName: entry?.companyName ?? h.companyName ?? null,
        holdingScore,
        holdingRank,
        top100AvgScore: avgScore,
        vsTopAvgPct,
      };
    });
}

function buildReplacementSuggestions(
  holdings: PortfolioPosition[],
  ranked: BursaPhase6RankedEntry[],
): BursaPhase6ReplacementSuggestion[] {
  const suggestions: BursaPhase6ReplacementSuggestion[] = [];

  for (const h of holdings.filter((p) => p.market === 'bursa' && (p.shares ?? 0) > 0)) {
    const code = h.symbol.replace(/\.KL$/i, '').trim();
    const held = ranked.find((r) => r.stockCode === code);
    const heldScore = held?.compositeScore ?? null;
    if (heldScore == null) continue;

    const candidates = ranked
      .filter(
        (r) =>
          r.stockCode !== code &&
          r.compositeScore != null &&
          r.compositeScore > heldScore &&
          r.dataStatus !== 'failed',
      )
      .slice(0, 5)
      .map((r) => ({
        stockCode: r.stockCode,
        companyName: r.companyName,
        score: r.compositeScore!,
        rank: r.rank,
        scoreDiff: r.compositeScore! - heldScore,
      }));

    if (candidates.length > 0) {
      suggestions.push({
        heldSymbol: code,
        heldCompanyName: held?.companyName ?? h.companyName ?? null,
        heldScore,
        heldRank: held?.rank ?? null,
        candidates,
      });
    }
  }

  return suggestions;
}

function buildFromScored(
  scored: BursaScoredStock[],
  codes: string[],
  holdings: PortfolioPosition[],
  fetchedFields: string[],
  missingFields: string[],
): BursaPhase6Analysis {
  const rankedStocks = [...scored]
    .filter((s) => s.compositeScore != null)
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

  const rankedTop100 = rankedStocks.slice(0, TOP_N).map((s, i) => toRankedEntry(s, i + 1));

  const styleRankings = Object.fromEntries(
    BURSA_INVESTMENT_STYLES.map((style) => [
      style,
      sortByStyle(scored, style)
        .slice(0, STYLE_TOP_N)
        .map((s, i) => toRankedEntry(s, i + 1)),
    ]),
  ) as BursaPhase6Analysis['styleRankings'];

  return {
    rankedTop100,
    styleRankings,
    portfolioSuggestions: BURSA_PORTFOLIO_BUDGETS_MYR.map((budget) =>
      buildPortfolioSuggestion(budget, rankedStocks),
    ),
    holdingComparisons: buildHoldingComparisons(holdings, rankedTop100),
    replacementSuggestions: buildReplacementSuggestions(holdings, rankedTop100),
    universeSize: codes.length,
    scoredCount: rankedStocks.length,
    fetchedFields,
    missingFields,
  };
}

export async function buildBursaPhase6Analysis(input: {
  holdings?: PortfolioPosition[];
  stockCodes?: string[];
}): Promise<BursaPhase6Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const codes = input.stockCodes ?? getBursaUniverseStockCodes();

  const bundles = await Promise.all(codes.map((c) => fetchBursaDisclosureBundle(c)));
  const snapshots = bundles.map(peerSnapshotFromBundle);

  const scored = bundles.map((bundle) => {
    if (bundle.dataSource !== 'none') fetchedFields.push(`phase6.${bundle.stockCode}`);
    else missingFields.push(`phase6.${bundle.stockCode}`);
    return scoreBursaStock({ bundle, allSnapshots: snapshots });
  });

  if (scored.some((s) => s.compositeScore != null)) fetchedFields.push('phase6.ranking');
  else missingFields.push('phase6.ranking');

  return buildFromScored(scored, codes, input.holdings ?? [], fetchedFields, missingFields);
}

export function buildBursaPhase6FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
}): BursaPhase6Analysis {
  const snapshots = input.bundles.map(peerSnapshotFromBundle);
  const scored = input.bundles.map((bundle) =>
    scoreBursaStock({ bundle, allSnapshots: snapshots }),
  );
  const codes = input.bundles.map((b) => b.stockCode);
  return buildFromScored(scored, codes, input.holdings ?? [], ['phase6.offline'], []);
}
