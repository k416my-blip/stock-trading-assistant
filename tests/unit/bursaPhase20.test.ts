import { describe, expect, it } from 'vitest';
import {
  computeValuationScore,
  scoreValuationMaterialItem,
  valuationIntelligenceMaterialScoreAdjustment,
  valuationRatingToSentiment,
} from '../../src/services/bursa/bursaValuationIntelligenceService';
import { enrichStockWithValuationIntelligence } from '../../src/services/bursa/bursaPhase20Analysis';
import {
  fairValueJudgmentJa,
  ratingFromValuationScore,
  resolveValuationSector,
  VALUATION_SCORE_MAX,
  VALUATION_SCORE_MIN,
} from '../../src/constants/bursaValuationIntelligence';
import {
  countAcquiredValuationFields,
  mergeValuationPartials,
  normalizeDebtToEquityRatio,
} from '../../src/services/bursa/bursaValuationIntelligenceProviders';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';
import type { BursaValuationIntelligenceAnalysis } from '../../src/types/bursaValuationIntelligence';

function minimalStock(code = '1155'): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName: 'Maybank',
    materialScore: 0,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['', '', ''],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'skipped',
      bursa_announcement: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

describe('bursaPhase20 valuation intelligence', () => {
  it('computeValuationScore stays within -20..+20', () => {
    const score = computeValuationScore(
      {
        roe: 22,
        roa: 1.8,
        pe: 9,
        pb: 0.85,
        peg: 0.8,
        debtEquity: 0.9,
        revenueGrowth: 8,
        epsGrowth: 10,
        currentRatio: 1.6,
      },
      'Banking',
    );
    expect(score).toBeGreaterThanOrEqual(VALUATION_SCORE_MIN);
    expect(score).toBeLessThanOrEqual(VALUATION_SCORE_MAX);
    expect(score).toBeGreaterThan(5);
  });

  it('ratingFromValuationScore maps bands', () => {
    expect(ratingFromValuationScore(14)).toBe('Strong Undervalued');
    expect(ratingFromValuationScore(7)).toBe('Undervalued');
    expect(ratingFromValuationScore(0)).toBe('Fair Value');
    expect(ratingFromValuationScore(-7)).toBe('Overvalued');
    expect(ratingFromValuationScore(-14)).toBe('Strong Overvalued');
  });

  it('resolveValuationSector maps audit stocks', () => {
    expect(resolveValuationSector('Banking')).toBe('Banking');
    expect(resolveValuationSector('Utilities')).toBe('Utilities');
    expect(resolveValuationSector('Consumer Products')).toBe('Consumer Products');
  });

  it('mergeValuationPartials prefers first non-null without speculation', () => {
    const merged = mergeValuationPartials([
      {
        source: 'yahoo_finance',
        metrics: { pe: 10.5, roe: 12 },
        shareBuybackDetected: null,
      },
      {
        source: 'financial_report',
        metrics: { revenueGrowth: 5.2 },
        shareBuybackDetected: null,
      },
    ]);
    expect(merged.metrics.pe).toBe(10.5);
    expect(merged.metrics.revenueGrowth).toBe(5.2);
    expect(merged.fieldSources.pe).toBe('yahoo_finance');
    expect(merged.fieldSources.revenueGrowth).toBe('financial_report');
  });

  it('countAcquiredValuationFields excludes null metrics', () => {
    const { acquired, total } = countAcquiredValuationFields({ pe: 10, roe: 12 }, null);
    expect(acquired).toBe(2);
    expect(total).toBe(22);
  });

  it('enrichStockWithValuationIntelligence offline marks missing', async () => {
    const enriched = await enrichStockWithValuationIntelligence({
      stock: minimalStock(),
      sector: 'Banking',
      fetchLiveExternal: false,
    });
    expect(enriched.missingFields).toContain('phase20.valuation_intelligence');
    expect(enriched.valuationIntelligence?.hasExtractableData).toBe(false);
  });

  it('material score adjustment bounded', () => {
    const adj = valuationIntelligenceMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: 'ok',
      valuationScore: 15,
      valuationRating: 'Strong Undervalued',
      fairValueJudgmentJa: fairValueJudgmentJa('Strong Undervalued'),
      fieldAcquisitionRate: 0.8,
      acquiredFieldCount: 18,
      totalFieldCount: 22,
      fieldSources: {},
      metrics: {},
      shareBuybackDetected: null,
      source: 'yahoo_finance',
      materialScoreAdjustment: 0,
      unavailableReason: null,
      displayJa: {} as never,
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    });
    expect(Math.abs(adj)).toBeLessThanOrEqual(10);
  });

  it('valuationRatingToSentiment maps all ratings', () => {
    expect(valuationRatingToSentiment('Strong Overvalued')).toBe('Bearish');
    expect(valuationRatingToSentiment('Overvalued')).toBe('Bearish');
    expect(valuationRatingToSentiment('Fair Value')).toBe('Neutral');
    expect(valuationRatingToSentiment('Undervalued')).toBe('Bullish');
    expect(valuationRatingToSentiment('Strong Undervalued')).toBe('Bullish');
  });

  it('scoreValuationMaterialItem: Strong Overvalued is always Bearish', () => {
    const analysis = mockValuationAnalysis('Strong Overvalued', -14);
    const item = scoreValuationMaterialItem(analysis, valuationMaterialInput('Strong Overvalued'));
    expect(valuationRatingToSentiment(analysis.valuationRating)).toBe('Bearish');
    expect(item.sentiment).toBe('悪材料');
    expect(item.score).toBeLessThan(0);
    expect(item.reasonJa).toContain('Bearish');
  });

  it('scoreValuationMaterialItem: Strong Undervalued is always Bullish', () => {
    const analysis = mockValuationAnalysis('Strong Undervalued', 14);
    const item = scoreValuationMaterialItem(analysis, valuationMaterialInput('Strong Undervalued'));
    expect(valuationRatingToSentiment(analysis.valuationRating)).toBe('Bullish');
    expect(item.sentiment).toBe('好材料');
    expect(item.score).toBeGreaterThan(0);
    expect(item.reasonJa).toContain('Bullish');
  });

  it('normalizeDebtToEquityRatio converts Yahoo percent to ratio', () => {
    expect(normalizeDebtToEquityRatio(175.305)).toBeCloseTo(1.75305, 4);
    expect(normalizeDebtToEquityRatio(103.668)).toBeCloseTo(1.03668, 4);
    expect(normalizeDebtToEquityRatio(0.9)).toBe(0.9);
  });

  it('computeValuationScore uses normalized debt/equity ratio', () => {
    const scoreHigh = computeValuationScore({ debtEquity: 1.75 }, 'Utilities');
    const scoreLow = computeValuationScore({ debtEquity: 0.8 }, 'Utilities');
    expect(scoreHigh).toBeLessThan(scoreLow);
  });
});

function mockValuationAnalysis(
  rating: BursaValuationIntelligenceAnalysis['valuationRating'],
  score: number,
): BursaValuationIntelligenceAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    valuationScore: score,
    valuationRating: rating,
    fairValueJudgmentJa: fairValueJudgmentJa(rating),
    fieldAcquisitionRate: 0.77,
    acquiredFieldCount: 17,
    totalFieldCount: 22,
    fieldSources: {},
    metrics: {},
    shareBuybackDetected: null,
    source: 'yahoo_finance',
    materialScoreAdjustment: 0,
    unavailableReason: null,
    displayJa: { valuationScore: `${score}`, valuationRating: rating } as never,
    evaluationJa: 'test',
    hasExtractableData: true,
    fetchedAt: '2026-06-11T00:00:00.000Z',
  };
}

function valuationMaterialInput(rating: string) {
  return {
    source: 'bursa_announcement' as const,
    sourceLabelJa: 'Phase20 Valuation Intelligence',
    title: `Valuation ${rating} (-14)`,
    url: null,
    publishedAt: '2026-06-11T00:00:00.000Z',
    idSuffix: `phase20-valuation-${rating}`,
  };
}
