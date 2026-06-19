/**
 * Phase24 — Analyst Consensus Intelligence（Step 3: service 骨格 · scoring · warnings）
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type {
  AnalystConsensusIntelligenceConfidence,
  AnalystConsensusIntelligenceDisplayFields,
  AnalystConsensusIntelligenceWarning,
  AnalystRevisionDirectionLabel,
  BursaAnalystConsensusIntelligenceAnalysis,
} from '../../types/bursaAnalystConsensusIntelligence';
import {
  ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
  ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaAnalystConsensusIntelligence';
import {
  ANALYST_CONSENSUS_FIELDS_TOTAL,
  ANALYST_CONSENSUS_HIGH_DISPERSION_THRESHOLD,
  ANALYST_CONSENSUS_MIN_COUNT_FOR_HIGH,
  ANALYST_CONSENSUS_MIN_COUNT_FOR_MEDIUM,
  ANALYST_CONSENSUS_SCORE_MAX,
  ANALYST_CONSENSUS_SCORE_MIN,
  ANALYST_CONSENSUS_SCORE_THRESHOLDS,
  ANALYST_CONSENSUS_STALE_DAYS,
  CONSENSUS_RATING_JA,
  REVISION_DIRECTION_JA,
} from '../../constants/bursaAnalystConsensusIntelligence';
import {
  fetchAllAnalystConsensusIntelligencePartials,
  type AnalystConsensusIntelligencePartial,
} from './bursaAnalystConsensusIntelligenceProviders';
import { resolveAnalystConsensusApiKeys } from './bursaAnalystConsensusService';

function clampScore(n: number): number {
  return Math.max(ANALYST_CONSENSUS_SCORE_MIN, Math.min(ANALYST_CONSENSUS_SCORE_MAX, Math.round(n)));
}

function fmtCount(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA;
  return String(Math.round(n));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA;
  return `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function fmtWarnings(warnings: AnalystConsensusIntelligenceWarning[]): string {
  if (warnings.length === 0) return '—';
  return warnings.join(', ');
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'yahoo_finance':
      return 'Yahoo Finance';
    case 'finnhub':
      return 'Finnhub';
    case 'alpha_vantage':
      return 'Alpha Vantage';
    case 'fmp':
      return 'FMP';
    case 'phase14_consensus':
      return 'Phase14 Analyst Consensus';
    case 'mock_fixture':
      return 'Mock Fixture (offline audit)';
    default:
      return ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA;
  }
}

function computeImpliedUpside(
  targetPrice: number | null,
  currentPrice: number | null,
  impliedFromProvider: number | null,
): number | null {
  if (impliedFromProvider != null && Number.isFinite(impliedFromProvider)) {
    return impliedFromProvider;
  }
  if (targetPrice == null || currentPrice == null || currentPrice <= 0) return null;
  if (targetPrice <= 0) return null;
  return ((targetPrice - currentPrice) / Math.abs(currentPrice)) * 100;
}

export { computeImpliedUpside };

export function computeBuyHoldSellBalance(input: {
  analystCount: number | null;
  buyCount: number | null;
  holdCount: number | null;
  sellCount: number | null;
}): {
  buyPct: number | null;
  holdPct: number | null;
  sellPct: number | null;
  labelJa: string;
} {
  const sum = (input.buyCount ?? 0) + (input.holdCount ?? 0) + (input.sellCount ?? 0);
  const total =
    input.analystCount != null && sum > 0 && input.analystCount !== sum
      ? sum
      : (input.analystCount ?? sum);
  if (total <= 0) {
    return {
      buyPct: null,
      holdPct: null,
      sellPct: null,
      labelJa: ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
    };
  }
  const buyPct = input.buyCount != null ? (input.buyCount / total) * 100 : null;
  const holdPct = input.holdCount != null ? (input.holdCount / total) * 100 : null;
  const sellPct = input.sellCount != null ? (input.sellCount / total) * 100 : null;
  const fmt = (n: number | null) => (n != null ? `${n.toFixed(0)}%` : '—');
  return {
    buyPct,
    holdPct,
    sellPct,
    labelJa: `Buy ${fmt(buyPct)} / Hold ${fmt(holdPct)} / Sell ${fmt(sellPct)}`,
  };
}

export function buildJapaneseEvaluationJa(input: {
  consensusRating: string;
  buyHoldSellLabelJa: string;
  targetPrice: string;
  currentPrice: string;
  impliedUpsidePct: string;
  targetRevisionDirection: string;
  consensusScore: string;
  confidence: AnalystConsensusIntelligenceConfidence;
  warnings: AnalystConsensusIntelligenceWarning[];
}): string {
  const warn =
    input.warnings.length > 0 ? `注意: ${input.warnings.join(', ')}` : null;
  return [
    'アナリスト・コンセンサス評価',
    input.consensusRating,
    input.buyHoldSellLabelJa,
    `目標 ${input.targetPrice} · 現在 ${input.currentPrice} · Upside ${input.impliedUpsidePct}`,
    `改定 ${input.targetRevisionDirection} · Score ${input.consensusScore} · 信頼度 ${input.confidence}`,
    warn,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function computeAnalystConsensusScore(input: {
  analystCount: number | null;
  buyCount: number | null;
  holdCount: number | null;
  sellCount: number | null;
  impliedUpsidePct: number | null;
  targetRevisionDirection: AnalystRevisionDirectionLabel | null;
  targetRevisionPct: number | null;
  ratingRevisionDirection: AnalystRevisionDirectionLabel | null;
}): number {
  let score = 0;
  const sum = (input.buyCount ?? 0) + (input.holdCount ?? 0) + (input.sellCount ?? 0);
  const total =
    input.analystCount != null && sum > 0 && input.analystCount !== sum
      ? sum
      : (input.analystCount ?? sum);

  if (total > 0 && input.buyCount != null) {
    const buyRatio = input.buyCount / total;
    if (buyRatio >= ANALYST_CONSENSUS_SCORE_THRESHOLDS.buyRatioHigh) score += 6;
    else if (buyRatio >= 0.5) score += 3;
  }

  if (total > 0 && input.sellCount != null) {
    const sellRatio = input.sellCount / total;
    if (sellRatio >= ANALYST_CONSENSUS_SCORE_THRESHOLDS.sellRatioHigh) score -= 6;
    else if (sellRatio >= 0.2) score -= 3;
  }

  const upside = input.impliedUpsidePct;
  if (upside != null) {
    if (upside >= ANALYST_CONSENSUS_SCORE_THRESHOLDS.upsideStrong) score += 8;
    else if (upside >= ANALYST_CONSENSUS_SCORE_THRESHOLDS.upsideModerate) score += 4;
    else if (upside <= ANALYST_CONSENSUS_SCORE_THRESHOLDS.downsideStrong) score -= 8;
    else if (upside <= ANALYST_CONSENSUS_SCORE_THRESHOLDS.downsideModerate) score -= 4;
  }

  if (input.targetRevisionDirection === 'Upgraded') {
    score += 4;
    if (
      input.targetRevisionPct != null &&
      input.targetRevisionPct >= ANALYST_CONSENSUS_SCORE_THRESHOLDS.targetRevisionStrong
    ) {
      score += 2;
    }
  } else if (input.targetRevisionDirection === 'Downgraded') {
    score -= 4;
    if (
      input.targetRevisionPct != null &&
      input.targetRevisionPct <= -ANALYST_CONSENSUS_SCORE_THRESHOLDS.targetRevisionStrong
    ) {
      score -= 2;
    }
  }

  if (input.ratingRevisionDirection === 'Upgraded') {
    score += ANALYST_CONSENSUS_SCORE_THRESHOLDS.ratingRevisionBoost;
  } else if (input.ratingRevisionDirection === 'Downgraded') {
    score -= ANALYST_CONSENSUS_SCORE_THRESHOLDS.ratingRevisionBoost;
  }

  return clampScore(score);
}

export function resolveAnalystConsensusConfidence(input: {
  analystCount: number | null;
  consensusDispersion: number | null;
  fieldCount: number;
  hasTargetAndPrice: boolean;
  warnings: AnalystConsensusIntelligenceWarning[];
}): AnalystConsensusIntelligenceConfidence {
  if (input.warnings.includes('provider_error') || input.warnings.includes('no_consensus_data')) {
    return 'Low';
  }
  if (
    input.analystCount != null &&
    input.analystCount >= ANALYST_CONSENSUS_MIN_COUNT_FOR_HIGH &&
    input.fieldCount >= 10 &&
    input.hasTargetAndPrice &&
    (input.consensusDispersion == null ||
      input.consensusDispersion < ANALYST_CONSENSUS_HIGH_DISPERSION_THRESHOLD)
  ) {
    return 'High';
  }
  if (
    input.analystCount != null &&
    input.analystCount >= ANALYST_CONSENSUS_MIN_COUNT_FOR_MEDIUM &&
    input.fieldCount >= 5
  ) {
    return 'Medium';
  }
  return 'Low';
}

export function collectAnalystConsensusWarnings(input: {
  partial: AnalystConsensusIntelligencePartial | null;
  now?: Date;
}): AnalystConsensusIntelligenceWarning[] {
  const warnings: AnalystConsensusIntelligenceWarning[] = [];
  const p = input.partial;
  const now = input.now ?? new Date();

  if (!p) {
    warnings.push('no_consensus_data');
    return warnings;
  }

  if (p.providerError) warnings.push('provider_error');
  if (p.targetPrice == null) warnings.push('missing_target_price');
  if (p.currentPrice == null) warnings.push('missing_current_price');

  if (p.analystCount != null && p.analystCount < ANALYST_CONSENSUS_MIN_COUNT_FOR_MEDIUM) {
    warnings.push('low_analyst_count');
  }

  if (
    p.consensusDispersion != null &&
    p.consensusDispersion >= ANALYST_CONSENSUS_HIGH_DISPERSION_THRESHOLD
  ) {
    warnings.push('high_dispersion');
  }

  if (p.updatedAt) {
    const updated = new Date(p.updatedAt);
    if (Number.isFinite(updated.getTime())) {
      const ageDays = (now.getTime() - updated.getTime()) / (24 * 3600 * 1000);
      if (ageDays > ANALYST_CONSENSUS_STALE_DAYS) warnings.push('stale_data');
    }
  }

  return [...new Set(warnings)];
}

function countAcquiredFields(p: AnalystConsensusIntelligencePartial): number {
  let n = 0;
  if (p.analystCount != null) n++;
  if (p.buyCount != null) n++;
  if (p.holdCount != null) n++;
  if (p.sellCount != null) n++;
  if (p.consensusRating != null) n++;
  if (p.targetPrice != null) n++;
  if (p.currentPrice != null) n++;
  if (p.impliedUpsidePct != null) n++;
  if (p.targetRevisionDirection != null) n++;
  if (p.targetRevisionPct != null) n++;
  if (p.ratingRevisionDirection != null) n++;
  if (p.consensusDispersion != null) n++;
  if (p.updatedAt != null) n++;
  return n;
}

function emptyAnalysis(
  unavailableReason?: string | null,
): BursaAnalystConsensusIntelligenceAnalysis {
  const missing = ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA;
  const displayJa: AnalystConsensusIntelligenceDisplayFields = {
    analystCount: missing,
    buyCount: missing,
    holdCount: missing,
    sellCount: missing,
    consensusRating: missing,
    targetPrice: missing,
    currentPrice: missing,
    impliedUpsidePct: missing,
    targetRevisionDirection: missing,
    targetRevisionPct: missing,
    ratingRevisionDirection: missing,
    consensusDispersion: missing,
    confidence: 'Low',
    consensusScore: '0',
    warnings: 'no_consensus_data',
    source: missing,
    updatedAt: missing,
  };
  return {
    availability: 'unavailable',
    availabilityLabelJa: ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA,
    analystCount: null,
    buyCount: null,
    holdCount: null,
    sellCount: null,
    consensusRating: null,
    targetPrice: null,
    currentPrice: null,
    impliedUpsidePct: null,
    targetRevisionDirection: null,
    targetRevisionPct: null,
    ratingRevisionDirection: null,
    consensusDispersion: null,
    confidence: 'Low',
    consensusScore: 0,
    warnings: ['no_consensus_data'],
    source: 'none',
    updatedAt: null,
    displayJa,
    evaluationJa: unavailableReason ?? ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fieldAcquisitionCount: 0,
    fieldAcquisitionTotal: ANALYST_CONSENSUS_FIELDS_TOTAL,
    fetchedAt: null,
  };
}

export async function buildAnalystConsensusIntelligenceAnalysis(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
  apiKeys?: AnalysisApiKeys;
}): Promise<BursaAnalystConsensusIntelligenceAnalysis> {
  const consensusApiKeys = input.apiKeys
    ? resolveAnalystConsensusApiKeys(input.apiKeys)
    : undefined;
  const merged = await fetchAllAnalystConsensusIntelligencePartials({
    stockCode: input.stockCode,
    analystConsensus: input.analystConsensus,
    useMockFixture: input.useMockFixture,
    fetchLiveExternal: input.fetchLiveExternal ?? false,
    apiKeys: consensusApiKeys,
  });

  const warnings = collectAnalystConsensusWarnings({ partial: merged });

  if (!merged || warnings.includes('no_consensus_data')) {
    return emptyAnalysis(
      merged?.providerError ??
        'Phase14 / mock fixture いずれからも Analyst Consensus Intelligence 取得不可',
    );
  }

  if (warnings.includes('provider_error') && !merged.analystCount && !merged.targetPrice && !merged.consensusRating) {
    return emptyAnalysis(merged.providerError ?? 'Provider error — safe fallback');
  }

  const impliedUpsidePct = computeImpliedUpside(
    merged.targetPrice,
    merged.currentPrice,
    merged.impliedUpsidePct,
  );

  const consensusScore = computeAnalystConsensusScore({
    analystCount: merged.analystCount,
    buyCount: merged.buyCount,
    holdCount: merged.holdCount,
    sellCount: merged.sellCount,
    impliedUpsidePct,
    targetRevisionDirection: merged.targetRevisionDirection,
    targetRevisionPct: merged.targetRevisionPct,
    ratingRevisionDirection: merged.ratingRevisionDirection,
  });

  const fieldAcquisitionCount = countAcquiredFields(merged);
  const hasTargetAndPrice = merged.targetPrice != null && merged.currentPrice != null;

  const confidence = resolveAnalystConsensusConfidence({
    analystCount: merged.analystCount,
    consensusDispersion: merged.consensusDispersion,
    fieldCount: fieldAcquisitionCount,
    hasTargetAndPrice,
    warnings,
  });

  const balance = computeBuyHoldSellBalance({
    analystCount: merged.analystCount,
    buyCount: merged.buyCount,
    holdCount: merged.holdCount,
    sellCount: merged.sellCount,
  });

  const displayJa: AnalystConsensusIntelligenceDisplayFields = {
    analystCount: fmtCount(merged.analystCount),
    buyCount: fmtCount(merged.buyCount),
    holdCount: fmtCount(merged.holdCount),
    sellCount: fmtCount(merged.sellCount),
    consensusRating: merged.consensusRating
      ? CONSENSUS_RATING_JA[merged.consensusRating]
      : ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
    targetPrice: fmtPrice(merged.targetPrice),
    currentPrice: fmtPrice(merged.currentPrice),
    impliedUpsidePct: fmtPct(impliedUpsidePct),
    targetRevisionDirection: merged.targetRevisionDirection
      ? REVISION_DIRECTION_JA[merged.targetRevisionDirection]
      : ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
    targetRevisionPct: fmtPct(merged.targetRevisionPct),
    ratingRevisionDirection: merged.ratingRevisionDirection
      ? REVISION_DIRECTION_JA[merged.ratingRevisionDirection]
      : ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
    consensusDispersion:
      merged.consensusDispersion != null
        ? `${merged.consensusDispersion}%`
        : ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
    confidence,
    consensusScore: fmtScore(consensusScore),
    warnings: fmtWarnings(warnings),
    source: sourceLabel(merged.source),
    updatedAt: merged.updatedAt ?? ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA,
  };

  const evaluationJa = buildJapaneseEvaluationJa({
    consensusRating: displayJa.consensusRating,
    buyHoldSellLabelJa: balance.labelJa,
    targetPrice: displayJa.targetPrice,
    currentPrice: displayJa.currentPrice,
    impliedUpsidePct: displayJa.impliedUpsidePct,
    targetRevisionDirection: displayJa.targetRevisionDirection,
    consensusScore: displayJa.consensusScore,
    confidence,
    warnings,
  });

  return {
    availability: 'available',
    availabilityLabelJa: 'Analyst Consensus Intelligence 取得済',
    analystCount: merged.analystCount,
    buyCount: merged.buyCount,
    holdCount: merged.holdCount,
    sellCount: merged.sellCount,
    consensusRating: merged.consensusRating,
    targetPrice: merged.targetPrice,
    currentPrice: merged.currentPrice,
    impliedUpsidePct,
    targetRevisionDirection: merged.targetRevisionDirection,
    targetRevisionPct: merged.targetRevisionPct,
    ratingRevisionDirection: merged.ratingRevisionDirection,
    consensusDispersion: merged.consensusDispersion,
    confidence,
    consensusScore,
    warnings,
    source: merged.source,
    updatedAt: merged.updatedAt,
    displayJa,
    evaluationJa,
    hasExtractableData: fieldAcquisitionCount > 0,
    fieldAcquisitionCount,
    fieldAcquisitionTotal: ANALYST_CONSENSUS_FIELDS_TOTAL,
    fetchedAt: new Date().toISOString(),
  };
}

export function analystConsensusIntelligenceMaterialScoreAdjustment(
  analysis: BursaAnalystConsensusIntelligenceAnalysis,
): number {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return 0;
  return Math.max(-8, Math.min(8, Math.round(analysis.consensusScore * 0.35)));
}
