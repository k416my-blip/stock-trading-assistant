/**
 * Phase17.5 / 16.8 — 材料スコア重みの実データ取得率ベース自動調整
 */
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import type { BursaInstitutionalTrendAnalysis } from '../../types/bursaInstitutionalTrend';
import type { BursaFixedInstitutionalBasketAnalysis } from '../../types/bursaFixedInstitutionalBasket';

export const BASE_TREND_MAX_ADJ = 12;
export const BASE_DIVIDEND_MAX_ADJ = 8;

export function computeTrendCoverageScore(input: {
  pairedInstitutionCount: number;
  trendConfidence: number;
  basketMax?: number;
}): number {
  const basketMax = input.basketMax ?? 30;
  const institutionCoverage = Math.min(1, input.pairedInstitutionCount / Math.max(4, basketMax * 0.2));
  const confidence = Math.min(1, Math.max(0, input.trendConfidence) / 100);
  return institutionCoverage * 0.65 + confidence * 0.35;
}

export function computeTrendMaterialMaxAdjustment(input: {
  pairedInstitutionCount: number;
  trendConfidence: number;
  basketMax?: number;
}): number {
  const quality = computeTrendCoverageScore(input);
  return Math.round(BASE_TREND_MAX_ADJ * (0.4 + 0.6 * quality) * 10) / 10;
}

export function computeDividendMaterialMaxAdjustment(fieldAcquisitionRate: number): number {
  const rate = Math.max(0, Math.min(1, fieldAcquisitionRate));
  return Math.round(BASE_DIVIDEND_MAX_ADJ * (0.35 + 0.65 * rate) * 10) / 10;
}

export function scaledInstitutionalTrendAdjustment(
  analysis: BursaInstitutionalTrendAnalysis | null,
  maxAdj: number,
): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  switch (analysis.trendDirection) {
    case 'Strong Accumulation':
      return maxAdj;
    case 'Accumulation':
      return maxAdj * 0.5;
    case 'Distribution':
      return -maxAdj * 0.5;
    case 'Strong Distribution':
      return -maxAdj;
    default:
      return 0;
  }
}

export function scaledDividendIntelligenceAdjustment(
  analysis: BursaDividendIntelligenceAnalysis | null,
  maxAdj: number,
): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  let ratio = 0;
  if (analysis.dividendYield != null && analysis.dividendYield >= 4) ratio += 0.25;
  if (analysis.consecutiveDividendYears != null && analysis.consecutiveDividendYears >= 3) ratio += 0.25;
  if (analysis.dividendGrowthRate != null && analysis.dividendGrowthRate > 0) ratio += 0.25;
  if (analysis.payoutRatio != null && analysis.payoutRatio > 0 && analysis.payoutRatio < 90) ratio += 0.125;
  if (analysis.dividendSustainabilityScore >= 70) ratio += 0.125;

  let neg = 0;
  if (analysis.dividendGrowthRate != null && analysis.dividendGrowthRate < -5) neg -= 0.375;
  if (analysis.consecutiveDividendYears === 0) neg -= 0.5;
  if (analysis.dividendYield != null && analysis.dividendYield < 0.5) neg -= 0.25;

  const raw = ratio * maxAdj + neg * maxAdj;
  return Math.max(-maxAdj, Math.min(maxAdj, Math.round(raw * 10) / 10));
}

export function institutionalTrendMaterialScoreAdjustment(
  analysis: BursaInstitutionalTrendAnalysis | null,
  basket?: BursaFixedInstitutionalBasketAnalysis | null,
): number {
  const paired = basket?.pairedInstitutionCount ?? 0;
  const confidence = basket?.trendConfidence ?? analysis?.trendConfidence ?? 0;
  const maxAdj = computeTrendMaterialMaxAdjustment({
    pairedInstitutionCount: paired,
    trendConfidence: confidence,
    basketMax: 30,
  });
  return scaledInstitutionalTrendAdjustment(analysis, maxAdj);
}

export function dividendIntelligenceMaterialScoreAdjustment(
  analysis: BursaDividendIntelligenceAnalysis | null,
): number {
  const rate = analysis?.fieldAcquisitionRate ?? 0;
  const maxAdj = computeDividendMaterialMaxAdjustment(rate);
  return scaledDividendIntelligenceAdjustment(analysis, maxAdj);
}
