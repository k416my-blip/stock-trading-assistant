/**
 * Bursa Phase 7 — AI資産運用（保有分析・売買判断・再構築）
 */
import type { PortfolioPosition } from '../../types';
import type {
  BursaDisclosureBundle,
  BursaPhase6RankedEntry,
  BursaPhase7Analysis,
} from '../../types/bursaDisclosure';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import {
  buildAddPositionJudgment,
  buildHoldingDiagnosis,
  buildStopLossWarnings,
  buildTakeProfitJudgment,
  mapOverallToHoldingAction,
} from './bursaHoldingsAction';
import { buildBursaPhase3FromSnapshots } from './bursaPhase3Analysis';
import { buildBursaPhase5Analysis } from './bursaPhase5Analysis';
import { buildBursaPhase6FromBundles } from './bursaPhase6Analysis';
import { scoreBursaStock, type BursaScoredStock } from './bursaPhase6Scoring';
import {
  buildPortfolioReconstruction,
  computePortfolioHealth,
  diagnoseInvestorType,
} from './bursaPortfolioHealth';
import { peerSnapshotFromBundle } from './bursaPeerSnapshotService';
import { extractBursaDerivedMetrics } from './bursaRankingMetrics';
import { getBursaUniverseStockCodes } from './bursaStockUniverse';

function normalizeCode(symbol: string): string {
  return symbol.replace(/\.KL$/i, '').trim();
}

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

function buildFullRankedMap(
  bundles: BursaDisclosureBundle[],
  snapshots: ReturnType<typeof peerSnapshotFromBundle>[],
): Map<string, BursaPhase6RankedEntry> {
  const scored = bundles.map((bundle) =>
    scoreBursaStock({ bundle, allSnapshots: snapshots }),
  );
  const ranked = [...scored]
    .filter((s) => s.compositeScore != null)
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
    .map((s, i) => toRankedEntry(s, i + 1));
  return new Map(ranked.map((r) => [r.stockCode, r]));
}

export async function buildBursaPhase7Analysis(input: {
  holdings?: PortfolioPosition[];
}): Promise<BursaPhase7Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const holdings = input.holdings ?? [];
  const bursaHoldings = holdings.filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0);

  const universeCodes = getBursaUniverseStockCodes();
  const holdingCodes = bursaHoldings.map((h) => normalizeCode(h.symbol));
  const allCodes = [...new Set([...universeCodes, ...holdingCodes])];

  const bundles = await Promise.all(allCodes.map((c) => fetchBursaDisclosureBundle(c)));
  const snapshots = bundles.map(peerSnapshotFromBundle);
  const bundleByCode = new Map(bundles.map((b) => [b.stockCode, b]));

  const universeBundles = bundles.filter((b) => universeCodes.includes(b.stockCode));
  const phase6 = buildBursaPhase6FromBundles({ bundles: universeBundles, holdings });
  fetchedFields.push(...phase6.fetchedFields);
  missingFields.push(...phase6.missingFields);

  const rankedByCode = buildFullRankedMap(bundles, snapshots);
  const universeScoredCount = phase6.scoredCount;

  const holdingsDiagnosis: BursaPhase7Analysis['holdingsDiagnosis'] = [];
  const addPosition: BursaPhase7Analysis['addPosition'] = [];
  const takeProfit: BursaPhase7Analysis['takeProfit'] = [];
  const stopLoss: BursaPhase7Analysis['stopLoss'] = [];

  for (const h of bursaHoldings) {
    const code = normalizeCode(h.symbol);
    const bundle = bundleByCode.get(code);
    if (!bundle || bundle.dataSource === 'none') {
      const name = h.companyName ?? null;
      holdingsDiagnosis.push({
        symbol: code,
        companyName: name,
        judgment: null,
        reasons: ['データ未取得'],
        compositeScore: null,
        rank: null,
      });
      addPosition.push({
        symbol: code,
        companyName: name,
        currentPrice: h.currentPrice ?? null,
        fairPrice: null,
        industryMedianPe: null,
        verdict: null,
        reasonJa: 'データ未取得',
      });
      takeProfit.push({
        symbol: code,
        companyName: name,
        targetPrice: null,
        fairPrice: null,
        currentPrice: h.currentPrice ?? null,
        premiumPct: null,
        recommendTakeProfit: null,
        reasonJa: 'データ未取得',
      });
      stopLoss.push({
        symbol: code,
        companyName: name,
        warnings: [],
        hasWarning: false,
      });
      missingFields.push(`phase7.${code}`);
      continue;
    }

    fetchedFields.push(`phase7.${code}`);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, snapshots);
    const derived = extractBursaDerivedMetrics(bundle, h.currentPrice ?? null);
    const currentPrice = derived.price;
    const phase5 = buildBursaPhase5Analysis({ bundle, phase3, currentPrice });
    const ranked = rankedByCode.get(code) ?? null;
    const companyName = ranked?.companyName ?? h.companyName ?? bundle.profile.companyName ?? null;

    const diagnosis = buildHoldingDiagnosis({
      symbol: code,
      companyName,
      phase5,
      ranked,
    });
    holdingsDiagnosis.push(diagnosis);

    const holdingAction = mapOverallToHoldingAction(phase5.overallJudgment);
    addPosition.push(
      buildAddPositionJudgment({ symbol: code, companyName, phase5, holdingAction }),
    );
    takeProfit.push(buildTakeProfitJudgment({ symbol: code, companyName, phase5, bundle }));
    stopLoss.push(
      buildStopLossWarnings({
        symbol: code,
        companyName,
        phase5,
        ranked,
        universeScoredCount,
      }),
    );
  }

  const portfolioHealth = computePortfolioHealth({ holdings, rankedByCode });
  const { type: investorType, reasonJa: investorTypeReasonJa } = diagnoseInvestorType({
    rankedByCode,
    holdings,
  });

  const reconstruction = buildPortfolioReconstruction({
    holdings,
    rankedTop: phase6.rankedTop100,
    replacementSuggestions: phase6.replacementSuggestions,
    holdingDiagnoses: holdingsDiagnosis.map((d) => ({
      symbol: d.symbol,
      judgment: d.judgment,
      companyName: d.companyName,
    })),
  });

  if (portfolioHealth.score != null) fetchedFields.push('phase7.portfolioHealth');
  else missingFields.push('phase7.portfolioHealth');

  if (investorType != null) fetchedFields.push('phase7.investorType');
  else missingFields.push('phase7.investorType');

  return {
    holdingsDiagnosis,
    addPosition,
    takeProfit,
    stopLoss,
    portfolioHealth,
    reconstruction,
    investorType,
    investorTypeReasonJa,
    fetchedFields,
    missingFields,
  };
}

export function buildBursaPhase7FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
}): BursaPhase7Analysis {
  const fetchedFields: string[] = ['phase7.offline'];
  const missingFields: string[] = [];
  const holdings = input.holdings ?? [];
  const bursaHoldings = holdings.filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0);
  const snapshots = input.bundles.map(peerSnapshotFromBundle);
  const bundleByCode = new Map(input.bundles.map((b) => [b.stockCode, b]));
  const phase6 = buildBursaPhase6FromBundles({ bundles: input.bundles, holdings });
  const rankedByCode = buildFullRankedMap(input.bundles, snapshots);

  const holdingsDiagnosis: BursaPhase7Analysis['holdingsDiagnosis'] = [];
  const addPosition: BursaPhase7Analysis['addPosition'] = [];
  const takeProfit: BursaPhase7Analysis['takeProfit'] = [];
  const stopLoss: BursaPhase7Analysis['stopLoss'] = [];

  for (const h of bursaHoldings) {
    const code = normalizeCode(h.symbol);
    const bundle = bundleByCode.get(code);
    if (!bundle) continue;

    const phase3 = buildBursaPhase3FromSnapshots(bundle, snapshots);
    const derived = extractBursaDerivedMetrics(bundle, h.currentPrice ?? null);
    const currentPrice = derived.price;
    const phase5 = buildBursaPhase5Analysis({ bundle, phase3, currentPrice });
    const ranked = rankedByCode.get(code) ?? null;
    const companyName = ranked?.companyName ?? h.companyName ?? bundle.profile.companyName ?? null;
    const holdingAction = mapOverallToHoldingAction(phase5.overallJudgment);

    holdingsDiagnosis.push(
      buildHoldingDiagnosis({ symbol: code, companyName, phase5, ranked }),
    );
    addPosition.push(
      buildAddPositionJudgment({ symbol: code, companyName, phase5, holdingAction }),
    );
    takeProfit.push(buildTakeProfitJudgment({ symbol: code, companyName, phase5, bundle }));
    stopLoss.push(
      buildStopLossWarnings({
        symbol: code,
        companyName,
        phase5,
        ranked,
        universeScoredCount: phase6.scoredCount,
      }),
    );
  }

  const portfolioHealth = computePortfolioHealth({ holdings, rankedByCode });
  const { type: investorType, reasonJa: investorTypeReasonJa } = diagnoseInvestorType({
    rankedByCode,
    holdings,
  });

  const reconstruction = buildPortfolioReconstruction({
    holdings,
    rankedTop: phase6.rankedTop100,
    replacementSuggestions: phase6.replacementSuggestions,
    holdingDiagnoses: holdingsDiagnosis.map((d) => ({
      symbol: d.symbol,
      judgment: d.judgment,
      companyName: d.companyName,
    })),
  });

  return {
    holdingsDiagnosis,
    addPosition,
    takeProfit,
    stopLoss,
    portfolioHealth,
    reconstruction,
    investorType,
    investorTypeReasonJa,
    fetchedFields,
    missingFields,
  };
}
