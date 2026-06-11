import { describe, expect, it } from 'vitest';
import {
  computeDividendMaterialMaxAdjustment,
  computeTrendMaterialMaxAdjustment,
  dividendIntelligenceMaterialScoreAdjustment,
  institutionalTrendMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaMaterialWeightCalibration';

describe('bursaMaterialWeightCalibration', () => {
  it('scales trend weight by paired institutions and confidence', () => {
    const low = computeTrendMaterialMaxAdjustment({
      pairedInstitutionCount: 1,
      trendConfidence: 40,
    });
    const high = computeTrendMaterialMaxAdjustment({
      pairedInstitutionCount: 12,
      trendConfidence: 90,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(12);
  });

  it('scales dividend weight by field acquisition rate', () => {
    expect(computeDividendMaterialMaxAdjustment(0)).toBeLessThan(computeDividendMaterialMaxAdjustment(1));
    expect(computeDividendMaterialMaxAdjustment(1)).toBeLessThanOrEqual(8);
  });

  it('applies institutional trend with adaptive cap', () => {
    const adj = institutionalTrendMaterialScoreAdjustment(
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        previousHoldingPercent: 10,
        currentHoldingPercent: 12,
        changePercent: 20,
        threeMonthTrend: 5,
        sixMonthTrend: 8,
        twelveMonthTrend: 12,
        trendDirection: 'Strong Accumulation',
        trendConfidence: 85,
        source: 'klse_shareholdings_page',
        unavailableReason: null,
        displayJa: {} as never,
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      },
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        basketMode: 'top30',
        basketMaxSize: 30,
        pairedInstitutionCount: 10,
        pairedInstitutions: [],
        legacy8PairedCount: 4,
        legacy8TwelveMonthTrend: 1,
        threeMonthTrend: 5,
        sixMonthTrend: 8,
        twelveMonthTrend: 12,
        trendDirection: 'Strong Accumulation',
        trendConfidence: 85,
        comparisons: [],
        unavailableReason: null,
        displayJa: {} as never,
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      },
    );
    expect(adj).toBeGreaterThan(6);
    expect(adj).toBeLessThanOrEqual(12);
  });

  it('applies dividend adjustment within adaptive cap', () => {
    const adj = dividendIntelligenceMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: '取得済',
      dividendYield: 5,
      payoutRatio: 45,
      dividendGrowthRate: 8,
      consecutiveDividendYears: 5,
      fiveYearCagr: 6,
      exDividendDate: '2026-02-01',
      paymentDate: '2026-02-20',
      dividendFrequency: '年2回',
      specialDividend: false,
      dividendSustainabilityScore: 75,
      source: 'yahoo_finance',
      fieldAcquisitionRate: 1,
      fieldSources: {},
      materialWeightMax: 8,
      unavailableReason: null,
      displayJa: {} as never,
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    });
    expect(adj).toBeGreaterThan(0);
    expect(adj).toBeLessThanOrEqual(8);
  });
});
