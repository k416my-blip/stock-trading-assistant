/**
 * Phase23 — Earnings Revision Intelligence
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import type {
  BursaEarningsRevisionIntelligenceAnalysis,
  EarningsRevisionConfidence,
  EarningsRevisionDirection,
  EarningsRevisionIntelligenceDisplayFields,
} from '../../types/bursaEarningsRevisionIntelligence';
import {
  EARNINGS_REVISION_FIELD_MISSING_JA,
  EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaEarningsRevisionIntelligence';
import {
  EARNINGS_REVISION_FIELDS_TOTAL,
  EARNINGS_REVISION_SCORE_MAX,
  EARNINGS_REVISION_SCORE_MIN,
  REVISION_DIRECTION_JA,
  REVISION_DIRECTION_THRESHOLDS,
} from '../../constants/bursaEarningsRevisionIntelligence';
import { fetchAllEarningsRevisionPartials } from './bursaEarningsRevisionIntelligenceProviders';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

const EARNINGS_REVISION_MATERIAL_WEIGHT = 0.45;

function clampScore(n: number): number {
  return Math.max(EARNINGS_REVISION_SCORE_MIN, Math.min(EARNINGS_REVISION_SCORE_MAX, Math.round(n)));
}

function fmtEps(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return EARNINGS_REVISION_FIELD_MISSING_JA;
  return n.toFixed(3);
}

function fmtRevenue(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return EARNINGS_REVISION_FIELD_MISSING_JA;
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString('en-MY');
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return EARNINGS_REVISION_FIELD_MISSING_JA;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtCount(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return EARNINGS_REVISION_FIELD_MISSING_JA;
  return String(Math.round(n));
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'yahoo_finance':
      return 'Yahoo Finance';
    case 'analyst_consensus':
      return 'Phase14 Analyst Consensus';
    case 'bursa_financial_report':
      return 'Bursa/KLSE Financial Report';
    default:
      return EARNINGS_REVISION_FIELD_MISSING_JA;
  }
}

export function computeRevisionDirection(score: number): EarningsRevisionDirection {
  if (score >= REVISION_DIRECTION_THRESHOLDS.strongUpward) return 'Strong Upward';
  if (score >= REVISION_DIRECTION_THRESHOLDS.upward) return 'Upward';
  if (score <= REVISION_DIRECTION_THRESHOLDS.strongDownward) return 'Strong Downward';
  if (score <= REVISION_DIRECTION_THRESHOLDS.downward) return 'Downward';
  return 'Stable';
}

export function computeEarningsRevisionScore(input: {
  epsRevision90d: number | null;
  epsRevision30d: number | null;
  revenueRevision30d: number | null;
  upgradeCount: number | null;
  downgradeCount: number | null;
}): number {
  let score = 0;

  if (input.epsRevision90d != null) {
    if (input.epsRevision90d > 10) score += 8;
    else if (input.epsRevision90d < -10) score -= 8;
  }

  if (input.epsRevision30d != null) {
    if (input.epsRevision30d > 5) score += 5;
    else if (input.epsRevision30d < -5) score -= 5;
  }

  const up = input.upgradeCount ?? 0;
  const down = input.downgradeCount ?? 0;
  if (input.upgradeCount != null || input.downgradeCount != null) {
    if (up > down) score += 4;
    else if (down > up) score -= 4;
  }

  if (input.revenueRevision30d != null && input.revenueRevision30d < 0) {
    score -= 3;
  }
  if (input.revenueRevision30d != null && input.revenueRevision30d > 0) {
    score += 2;
  }

  const direction = computeRevisionDirection(score);
  if (direction === 'Strong Upward') return EARNINGS_REVISION_SCORE_MAX;
  if (direction === 'Strong Downward') return EARNINGS_REVISION_SCORE_MIN;

  return clampScore(score);
}

export function resolveRevisionConfidence(input: {
  fieldCount: number;
  source: string;
  hasEpsRevision90d: boolean;
  hasUpgradeDowngrade: boolean;
}): EarningsRevisionConfidence {
  if (
    input.fieldCount >= 8 &&
    input.source === 'yahoo_finance' &&
    input.hasEpsRevision90d &&
    input.hasUpgradeDowngrade
  ) {
    return 'High';
  }
  if (input.fieldCount >= 4) return 'Medium';
  return 'Low';
}

function countAcquiredFields(p: {
  epsEstimateCurrentFy: number | null;
  epsEstimateNextFy: number | null;
  epsRevision7d: number | null;
  epsRevision30d: number | null;
  epsRevision90d: number | null;
  revenueEstimateCurrentFy: number | null;
  revenueEstimateNextFy: number | null;
  revenueRevision30d: number | null;
  netProfitEstimateCurrentFy: number | null;
  netProfitRevision30d: number | null;
  upgradeCount: number | null;
  downgradeCount: number | null;
}): number {
  let n = 0;
  if (p.epsEstimateCurrentFy != null) n++;
  if (p.epsEstimateNextFy != null) n++;
  if (p.epsRevision7d != null) n++;
  if (p.epsRevision30d != null) n++;
  if (p.epsRevision90d != null) n++;
  if (p.revenueEstimateCurrentFy != null) n++;
  if (p.revenueEstimateNextFy != null) n++;
  if (p.revenueRevision30d != null) n++;
  if (p.netProfitEstimateCurrentFy != null) n++;
  if (p.netProfitRevision30d != null) n++;
  if (p.upgradeCount != null) n++;
  if (p.downgradeCount != null) n++;
  return n;
}

function hasRevisionSeriesData(p: {
  epsRevision7d: number | null;
  epsRevision30d: number | null;
  epsRevision90d: number | null;
  revenueRevision30d: number | null;
  upgradeCount: number | null;
  downgradeCount: number | null;
}): boolean {
  return (
    p.epsRevision30d != null ||
    p.epsRevision90d != null ||
    p.revenueRevision30d != null ||
    p.upgradeCount != null ||
    p.downgradeCount != null
  );
}

function emptyAnalysis(unavailableReason?: string | null): BursaEarningsRevisionIntelligenceAnalysis {
  const missing = EARNINGS_REVISION_FIELD_MISSING_JA;
  const displayJa: EarningsRevisionIntelligenceDisplayFields = {
    epsEstimateCurrentFy: missing,
    epsEstimateNextFy: missing,
    epsRevision7d: missing,
    epsRevision30d: missing,
    epsRevision90d: missing,
    revenueEstimateCurrentFy: missing,
    revenueEstimateNextFy: missing,
    revenueRevision30d: missing,
    netProfitEstimateCurrentFy: missing,
    netProfitRevision30d: missing,
    upgradeCount: missing,
    downgradeCount: missing,
    revisionDirection: missing,
    revisionConfidence: 'Low',
    revisionScore: '0',
    source: missing,
    unavailableReason: unavailableReason ?? missing,
  };
  return {
    availability: 'unavailable',
    availabilityLabelJa: EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA,
    source: 'none',
    epsEstimateCurrentFy: null,
    epsEstimateNextFy: null,
    epsRevision7d: null,
    epsRevision30d: null,
    epsRevision90d: null,
    revenueEstimateCurrentFy: null,
    revenueEstimateNextFy: null,
    revenueRevision30d: null,
    netProfitEstimateCurrentFy: null,
    netProfitRevision30d: null,
    upgradeCount: null,
    downgradeCount: null,
    revisionDirection: null,
    revisionConfidence: 'Low',
    revisionScore: 0,
    unavailableReason: unavailableReason ?? 'Yahoo / Phase14 / Bursa いずれからも Revision 系データ未取得',
    displayJa,
    evaluationJa: EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA,
    hasRevisionSeriesData: false,
    hasExtractableData: false,
    fieldAcquisitionCount: 0,
    fieldAcquisitionTotal: EARNINGS_REVISION_FIELDS_TOTAL,
    fetchedAt: null,
  };
}

export async function buildEarningsRevisionIntelligenceAnalysis(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  financialReport?: FinancialReportAnalysis | null;
  fetchLiveExternal: boolean;
}): Promise<BursaEarningsRevisionIntelligenceAnalysis> {
  const merged = await fetchAllEarningsRevisionPartials({
    stockCode: input.stockCode,
    analystConsensus: input.analystConsensus,
    financialReport: input.financialReport,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  if (!merged) {
    return emptyAnalysis(
      'Yahoo earningsTrend / Phase14 Analyst Consensus / Bursa FR いずれからも取得不可',
    );
  }

  const revisionScore = computeEarningsRevisionScore({
    epsRevision90d: merged.epsRevision90d,
    epsRevision30d: merged.epsRevision30d,
    revenueRevision30d: merged.revenueRevision30d,
    upgradeCount: merged.upgradeCount,
    downgradeCount: merged.downgradeCount,
  });

  const revisionDirection = computeRevisionDirection(revisionScore);
  const fieldAcquisitionCount = countAcquiredFields(merged);
  const revisionSeries = hasRevisionSeriesData(merged);

  const revisionConfidence = resolveRevisionConfidence({
    fieldCount: fieldAcquisitionCount,
    source: merged.source,
    hasEpsRevision90d: merged.epsRevision90d != null,
    hasUpgradeDowngrade: merged.upgradeCount != null || merged.downgradeCount != null,
  });

  const displayJa: EarningsRevisionIntelligenceDisplayFields = {
    epsEstimateCurrentFy: fmtEps(merged.epsEstimateCurrentFy),
    epsEstimateNextFy: fmtEps(merged.epsEstimateNextFy),
    epsRevision7d: fmtPct(merged.epsRevision7d),
    epsRevision30d: fmtPct(merged.epsRevision30d),
    epsRevision90d: fmtPct(merged.epsRevision90d),
    revenueEstimateCurrentFy: fmtRevenue(merged.revenueEstimateCurrentFy),
    revenueEstimateNextFy: fmtRevenue(merged.revenueEstimateNextFy),
    revenueRevision30d: fmtPct(merged.revenueRevision30d),
    netProfitEstimateCurrentFy: fmtRevenue(merged.netProfitEstimateCurrentFy),
    netProfitRevision30d: fmtPct(merged.netProfitRevision30d),
    upgradeCount: fmtCount(merged.upgradeCount),
    downgradeCount: fmtCount(merged.downgradeCount),
    revisionDirection: REVISION_DIRECTION_JA[revisionDirection],
    revisionConfidence,
    revisionScore: fmtScore(revisionScore),
    source: sourceLabel(merged.source),
    unavailableReason: merged.unavailableReason ?? EARNINGS_REVISION_FIELD_MISSING_JA,
  };

  const evaluationJa = revisionSeries
    ? [
        'Earnings Revision Intelligence',
        displayJa.revisionDirection,
        `EPS 30D ${displayJa.epsRevision30d} · 90D ${displayJa.epsRevision90d}`,
        `Score ${displayJa.revisionScore} · Confidence ${revisionConfidence}`,
      ].join(' · ')
    : [
        'Earnings Revision Intelligence',
        'Revision系データ未取得',
        merged.unavailableReason ?? EARNINGS_REVISION_FIELD_MISSING_JA,
      ].join(' · ');

  return {
    availability: 'available',
    availabilityLabelJa: revisionSeries
      ? 'Earnings Revision Intelligence 取得済'
      : 'Earnings Revision Intelligence 部分取得',
    source: merged.source,
    epsEstimateCurrentFy: merged.epsEstimateCurrentFy,
    epsEstimateNextFy: merged.epsEstimateNextFy,
    epsRevision7d: merged.epsRevision7d,
    epsRevision30d: merged.epsRevision30d,
    epsRevision90d: merged.epsRevision90d,
    revenueEstimateCurrentFy: merged.revenueEstimateCurrentFy,
    revenueEstimateNextFy: merged.revenueEstimateNextFy,
    revenueRevision30d: merged.revenueRevision30d,
    netProfitEstimateCurrentFy: merged.netProfitEstimateCurrentFy,
    netProfitRevision30d: merged.netProfitRevision30d,
    upgradeCount: merged.upgradeCount,
    downgradeCount: merged.downgradeCount,
    revisionDirection,
    revisionConfidence,
    revisionScore,
    unavailableReason: merged.unavailableReason,
    displayJa,
    evaluationJa,
    hasRevisionSeriesData: revisionSeries,
    hasExtractableData: fieldAcquisitionCount > 0,
    fieldAcquisitionCount,
    fieldAcquisitionTotal: EARNINGS_REVISION_FIELDS_TOTAL,
    fetchedAt: new Date().toISOString(),
  };
}

export function earningsRevisionIntelligenceMaterialScoreAdjustment(
  analysis: BursaEarningsRevisionIntelligenceAnalysis,
): number {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return 0;
  return Math.max(-8, Math.min(8, Math.round(analysis.revisionScore * 0.35)));
}

export function scoreEarningsRevisionMaterialItem(
  analysis: BursaEarningsRevisionIntelligenceAnalysis,
  raw: RawMaterialInput & { id?: string },
): BursaMaterialItem {
  const weighted = Math.round(analysis.revisionScore * EARNINGS_REVISION_MATERIAL_WEIGHT);
  const score = Math.max(-100, Math.min(100, weighted));
  const sentiment: BursaMaterialSentiment =
    score > 8 ? '好材料' : score < -8 ? '悪材料' : '中立';
  return {
    id: raw.id ?? 'phase23-earnings-revision',
    title: raw.title,
    source: raw.source,
    sourceLabelJa: raw.sourceLabelJa ?? 'Phase23 Earnings Revision Intelligence',
    score,
    sentiment,
    scoreJa: fmtScore(score),
    reasonJa: analysis.evaluationJa,
    detailJa: analysis.evaluationJa,
    publishedAt: raw.publishedAt ?? null,
    url: raw.url ?? null,
  };
}

export function earningsRevisionIntelligenceToMaterialInputs(
  analysis: BursaEarningsRevisionIntelligenceAnalysis,
): Array<RawMaterialInput & { id?: string }> {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      id: 'phase23-earnings-revision',
      title: `Earnings Revision ${d.revisionDirection} · Score ${d.revisionScore}`,
      source: 'bursa_announcement',
      url: null,
      publishedAt: null,
      sourceLabelJa: 'Phase23 Earnings Revision Intelligence',
    },
  ];
}

export function isUpwardRevision(
  direction: EarningsRevisionDirection | null,
): boolean {
  return direction === 'Upward' || direction === 'Strong Upward';
}

export function isDownwardRevision(
  direction: EarningsRevisionDirection | null,
): boolean {
  return direction === 'Downward' || direction === 'Strong Downward';
}
