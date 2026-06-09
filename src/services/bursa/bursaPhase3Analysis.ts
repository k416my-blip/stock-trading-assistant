/**
 * Bursa Phase 3 — 同業比較・業界ランキング・競争優位・バフェットスコア
 */
import type { BursaDisclosureBundle, BursaPhase3Analysis } from '../../types/bursaDisclosure';
import { detectBursaInvestmentType } from './bursaAiAnalysis';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';
import { computeBuffettScore } from './bursaBuffettScore';
import { computeCompetitiveAdvantage } from './bursaCompetitiveAdvantage';
import {
  buildPeerComparisonMetrics,
  computeOverallIndustryRank,
  countIndustryPeers,
  peerMedianPe,
  rankAmongPeers,
} from './bursaPeerComparison';
import { fetchSectorPeerSnapshots } from './bursaPeerSnapshotService';
import {
  getSectorPeerCodes,
  resolveBursaSectorKey,
  sectorDisplayJa,
} from './bursaSectorPeers';

function countIncreases(values: (number | null)[]): number {
  let n = 0;
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if (a != null && b != null && b > a) n++;
  }
  return n;
}

function buildEnhancedReasons(input: {
  type: string | null;
  trend: ReturnType<typeof buildBursaFiveYearTrend>;
  industryRanks: BursaPhase3Analysis['industryRanks'];
  buffettTotal: number | null;
}): string[] {
  if (!input.type) return [];
  const reasons: string[] = [];
  const revInc = countIncreases(input.trend.revenue);
  const profitInc = countIncreases(input.trend.netProfit);
  if (revInc >= 3) reasons.push(`売上${revInc}期連続増加`);
  if (profitInc >= 3) reasons.push('利益成長トレンド良好');
  if (input.industryRanks.marketCap === 1) reasons.push('同業時価総額1位');
  else if (input.industryRanks.overall != null && input.industryRanks.overall <= 2) {
    reasons.push(`業界総合 ${input.industryRanks.overall}位`);
  }
  if (input.buffettTotal != null && input.buffettTotal >= 70) {
    reasons.push(`バフェットスコア ${input.buffettTotal}/100`);
  }
  return reasons.slice(0, 3);
}

export async function buildBursaPhase3Analysis(
  bundle: BursaDisclosureBundle,
): Promise<BursaPhase3Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const stockCode = bundle.stockCode;
  const sectorKey = resolveBursaSectorKey(bundle.profile.sector);
  const peerCodes = getSectorPeerCodes(bundle.profile.sector, stockCode);

  const peerSnapshots = await fetchSectorPeerSnapshots(peerCodes, stockCode);
  const okPeers = peerSnapshots.filter((s) => s.status !== 'failed');
  if (okPeers.length > 0) fetchedFields.push('phase3.peerSnapshots');
  else missingFields.push('phase3.peerSnapshots');

  const comparisonMetrics = buildPeerComparisonMetrics(stockCode, peerSnapshots);
  if (comparisonMetrics.some((m) => m.targetRank != null)) fetchedFields.push('phase3.peerComparison');
  else missingFields.push('phase3.peerComparison');

  const industryCompanyCount = countIndustryPeers(peerSnapshots);
  const industryRanks = {
    marketCap: rankAmongPeers(stockCode, peerSnapshots, 'marketCap').rank,
    netProfit: rankAmongPeers(stockCode, peerSnapshots, 'netProfit').rank,
    dividendYield: rankAmongPeers(stockCode, peerSnapshots, 'dividendYieldPct').rank,
    roe: rankAmongPeers(stockCode, peerSnapshots, 'roePct').rank,
    overall: computeOverallIndustryRank(stockCode, peerSnapshots),
  };
  if (industryCompanyCount > 0) fetchedFields.push('phase3.industryRanking');
  else missingFields.push('phase3.industryRanking');

  const competitiveAdvantage = computeCompetitiveAdvantage({
    targetCode: stockCode,
    snapshots: peerSnapshots,
    companyOverview: bundle.profile.companyOverview,
  });
  if (Object.values(competitiveAdvantage).some((d) => d.score != null)) {
    fetchedFields.push('phase3.competitiveAdvantage');
  } else {
    missingFields.push('phase3.competitiveAdvantage');
  }

  const buffettScore = computeBuffettScore(bundle, competitiveAdvantage);
  if (buffettScore.totalScore != null) fetchedFields.push('phase3.buffettScore');
  else missingFields.push('phase3.buffettScore');

  const trend = buildBursaFiveYearTrend(bundle);
  const revenueIncreases = countIncreases(trend.revenue);
  const profitIncreases = countIncreases(trend.netProfit);
  const revVals = trend.revenue.filter((v): v is number => v != null);
  const revenueDeclining =
    revVals.length >= 2 && revVals[revVals.length - 1] < revVals[revVals.length - 2];
  const medianPe = peerMedianPe(peerSnapshots);

  const enhancedInvestmentType = detectBursaInvestmentType({
    sector: bundle.profile.sector,
    revenueIncreases,
    profitIncreases,
    dividendYieldPct: bundle.profile.dividendYieldPct,
    revenueDeclining,
    pe: bundle.profile.pe,
    peerMedianPe: medianPe,
  });

  const peerNames = peerSnapshots
    .filter((s) => s.stockCode !== stockCode && s.companyName)
    .map((s) => s.companyName!);

  return {
    sectorKey,
    sectorLabelJa: sectorDisplayJa(sectorKey),
    peerSnapshots,
    peerNames,
    comparisonMetrics,
    industryCompanyCount,
    industryRanks,
    competitiveAdvantage,
    buffettScore,
    enhancedInvestmentType,
    enhancedJudgmentReasons: buildEnhancedReasons({
      type: enhancedInvestmentType,
      trend,
      industryRanks,
      buffettTotal: buffettScore.totalScore,
    }),
    peerMedianPe: medianPe,
    fetchedFields,
    missingFields,
  };
}

/** テスト用 — ネットワークなしで Phase3 分析 */
export function buildBursaPhase3FromSnapshots(
  bundle: BursaDisclosureBundle,
  peerSnapshots: import('../../types/bursaDisclosure').BursaPeerSnapshot[],
): BursaPhase3Analysis {
  const stockCode = bundle.stockCode;
  const sectorKey = resolveBursaSectorKey(bundle.profile.sector);
  const comparisonMetrics = buildPeerComparisonMetrics(stockCode, peerSnapshots);
  const industryCompanyCount = countIndustryPeers(peerSnapshots);
  const industryRanks = {
    marketCap: rankAmongPeers(stockCode, peerSnapshots, 'marketCap').rank,
    netProfit: rankAmongPeers(stockCode, peerSnapshots, 'netProfit').rank,
    dividendYield: rankAmongPeers(stockCode, peerSnapshots, 'dividendYieldPct').rank,
    roe: rankAmongPeers(stockCode, peerSnapshots, 'roePct').rank,
    overall: computeOverallIndustryRank(stockCode, peerSnapshots),
  };
  const competitiveAdvantage = computeCompetitiveAdvantage({
    targetCode: stockCode,
    snapshots: peerSnapshots,
    companyOverview: bundle.profile.companyOverview,
  });
  const buffettScore = computeBuffettScore(bundle, competitiveAdvantage);
  const trend = buildBursaFiveYearTrend(bundle);
  const revenueIncreases = countIncreases(trend.revenue);
  const profitIncreases = countIncreases(trend.netProfit);
  const revVals = trend.revenue.filter((v): v is number => v != null);
  const revenueDeclining =
    revVals.length >= 2 && revVals[revVals.length - 1] < revVals[revVals.length - 2];
  const medianPe = peerMedianPe(peerSnapshots);
  const enhancedInvestmentType = detectBursaInvestmentType({
    sector: bundle.profile.sector,
    revenueIncreases,
    profitIncreases,
    dividendYieldPct: bundle.profile.dividendYieldPct,
    revenueDeclining,
    pe: bundle.profile.pe,
    peerMedianPe: medianPe,
  });
  return {
    sectorKey,
    sectorLabelJa: sectorDisplayJa(sectorKey),
    peerSnapshots,
    peerNames: peerSnapshots
      .filter((s) => s.stockCode !== stockCode && s.companyName)
      .map((s) => s.companyName!),
    comparisonMetrics,
    industryCompanyCount,
    industryRanks,
    competitiveAdvantage,
    buffettScore,
    enhancedInvestmentType,
    enhancedJudgmentReasons: buildEnhancedReasons({
      type: enhancedInvestmentType,
      trend,
      industryRanks,
      buffettTotal: buffettScore.totalScore,
    }),
    peerMedianPe: medianPe,
    fetchedFields: ['phase3.offline'],
    missingFields: [],
  };
}
