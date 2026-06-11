import { describe, expect, it } from 'vitest';
import {
  classifyDcfUnavailableReason,
  classifyDdmUnavailableReason,
  computeDcfFairPrice,
  computeDdmFairPrice,
  computeFairValueConfidence,
  computeFairValueDerivedMetrics,
  computeFairValueRange,
  computeFairValueScore,
  fairValueIntelligenceMaterialScoreAdjustment,
  resolveModelsUsed,
  scoreFairValueMaterialItem,
} from '../../src/services/bursa/bursaFairValueIntelligenceService';
import { mergeFairValueInputs, buildFinancialReportFairValuePartial } from '../../src/services/bursa/bursaFairValueIntelligenceProviders';
import { enrichStockWithFairValueIntelligence } from '../../src/services/bursa/bursaPhase21Analysis';
import {
  FAIR_VALUE_SCORE_MAX,
  FAIR_VALUE_SCORE_MIN,
  recommendationFromFairValueScore,
} from '../../src/constants/bursaFairValueIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';
import type { BursaFairValueIntelligenceAnalysis } from '../../src/types/bursaFairValueIntelligence';

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

describe('bursaPhase21 fair value intelligence', () => {
  it('computeDcfFairPrice returns positive fair price with valid inputs', () => {
    const fair = computeDcfFairPrice({
      freeCashflow: 5_000_000_000,
      fcfGrowthPct: 5,
      sharesOutstanding: 10_000_000_000,
      discountRate: 0.09,
      terminalGrowth: 0.025,
    });
    expect(fair).not.toBeNull();
    expect(fair!).toBeGreaterThan(0);
  });

  it('computeDdmFairPrice returns positive fair price for dividend stock', () => {
    const fair = computeDdmFairPrice({
      currentPrice: 10,
      dividendPerShare: 0.4,
      dividendYieldPct: 4,
      dividendGrowthPct: 3,
      requiredReturn: 0.08,
    });
    expect(fair).not.toBeNull();
    expect(fair!).toBeGreaterThan(0);
  });

  it('computeFairValueRange aggregates model prices', () => {
    const range = computeFairValueRange([8.5, 10.2, 9.1]);
    expect(range.low).toBe(8.5);
    expect(range.high).toBe(10.2);
    expect(range.mid).toBeCloseTo(9.27, 1);
  });

  it('computeFairValueDerivedMetrics calculates upside and MoS', () => {
    const m = computeFairValueDerivedMetrics({
      currentPrice: 10,
      fairValueMid: 12,
      fairValueLow: 9,
    });
    expect(m.upsidePct).toBeCloseTo(20, 1);
    expect(m.marginOfSafetyPct).toBeCloseTo(16.67, 1);
    expect(m.downsidePct).toBeCloseTo(10, 1);
  });

  it('computeFairValueScore stays within -20..+20', () => {
    const score = computeFairValueScore({
      upsidePct: 35,
      marginOfSafetyPct: 28,
      downsidePct: 5,
    });
    expect(score).toBeGreaterThanOrEqual(FAIR_VALUE_SCORE_MIN);
    expect(score).toBeLessThanOrEqual(FAIR_VALUE_SCORE_MAX);
    expect(score).toBeGreaterThan(10);
  });

  it('recommendationFromFairValueScore maps bands', () => {
    expect(recommendationFromFairValueScore(14)).toBe('Strong Buy');
    expect(recommendationFromFairValueScore(7)).toBe('Buy');
    expect(recommendationFromFairValueScore(0)).toBe('Hold');
    expect(recommendationFromFairValueScore(-7)).toBe('Reduce');
    expect(recommendationFromFairValueScore(-14)).toBe('Avoid');
  });

  it('scoreFairValueMaterialItem: Strong Buy is Bullish', () => {
    const analysis = mockFairValueAnalysis('Strong Buy', 14);
    const item = scoreFairValueMaterialItem(analysis, fairValueMaterialInput('Strong Buy'));
    expect(item.sentiment).toBe('好材料');
    expect(item.score).toBeGreaterThan(0);
  });

  it('scoreFairValueMaterialItem: Avoid is Bearish', () => {
    const analysis = mockFairValueAnalysis('Avoid', -14);
    const item = scoreFairValueMaterialItem(analysis, fairValueMaterialInput('Avoid'));
    expect(item.sentiment).toBe('悪材料');
    expect(item.score).toBeLessThan(0);
  });

  it('enrichStockWithFairValueIntelligence offline marks missing', async () => {
    const enriched = await enrichStockWithFairValueIntelligence({
      stock: minimalStock(),
      sector: 'Banking',
      fetchLiveExternal: false,
    });
    expect(enriched.missingFields).toContain('phase21.fair_value_intelligence');
    expect(enriched.fairValueIntelligence?.hasExtractableData).toBe(false);
  });

  it('material score adjustment bounded', () => {
    const adj = fairValueIntelligenceMaterialScoreAdjustment(mockFairValueAnalysis('Strong Buy', 15));
    expect(Math.abs(adj)).toBeLessThanOrEqual(10);
  });

  it('classifyDcfUnavailableReason: fcf missing', () => {
    const code = classifyDcfUnavailableReason({
      inputs: {
        currentPrice: 10,
        freeCashflow: null,
        freeCashflowIsOperatingProxy: false,
        fcfGrowth: 5,
        earningsGrowth: null,
        sharesOutstanding: 1e9,
        dividendYield: null,
        dividendPerShare: null,
        dividendGrowth: null,
        trailingEps: null,
      },
      growthValue: 5,
      fairPrice: null,
      rawFairBeforeSanity: null,
      discountRate: 0.09,
      terminalGrowth: 0.025,
    });
    expect(code).toBe('fcf_missing');
  });

  it('classifyDdmUnavailableReason: growth spread insufficient', () => {
    const code = classifyDdmUnavailableReason({
      isDividendStock: true,
      inputs: {
        currentPrice: 10,
        freeCashflow: null,
        freeCashflowIsOperatingProxy: false,
        fcfGrowth: null,
        earningsGrowth: null,
        sharesOutstanding: null,
        dividendYield: 5,
        dividendPerShare: 0.5,
        dividendGrowth: 8,
        trailingEps: null,
      },
      yieldPct: 5,
      fairPrice: null,
      rawFairBeforeSanity: null,
      dividendGrowth: 8,
      requiredReturn: 0.08,
    });
    expect(code).toBe('growth_rate_spread_insufficient');
  });

  it('mergeFairValueInputs: FR fills fcfGrowth when Yahoo missing', () => {
    const fr = buildFinancialReportFairValuePartial({
      stockCode: '1155',
      quarterEndDate: null,
      plainTextLength: 100,
      hasExtractableData: true,
      analysisContextJa: '',
      extracted: {
        revenueGrowth: null,
        profitGrowth: {
          label: 'Net Profit',
          currentQuarter: 100,
          priorYearQuarter: 90,
          growthPct: 11.1,
          growthLabelJa: '+11.1%',
        },
        outlook: [],
        guidance: [],
        risks: [],
        opportunities: [],
        managementCommentary: [],
      },
    });
    const merged = mergeFairValueInputs(null, fr);
    expect(merged.inputs.fcfGrowth).toBeCloseTo(11.1, 1);
    expect(merged.fieldSources.fcfGrowth).toBe('financial_report');
  });

  it('resolveModelsUsed and confidence', () => {
    const dcf = { model: 'dcf' as const, fairPrice: 12, source: 'computed' as const, inputsUsedJa: [], unavailableReasonJa: null };
    const per = { model: 'per' as const, fairPrice: 11, source: 'computed' as const, inputsUsedJa: [], unavailableReasonJa: null };
    const used = resolveModelsUsed({ dcf, ddm: null, per });
    expect(used).toEqual(['dcf', 'per']);
    expect(computeFairValueConfidence({ modelsUsed: used, fieldAcquisitionRate: 0.8, fieldSources: { currentPrice: 'yahoo_finance' } })).toBe('High');
  });
});

function mockFairValueAnalysis(
  rec: BursaFairValueIntelligenceAnalysis['recommendation'],
  score: number,
): BursaFairValueIntelligenceAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    currentPrice: 10,
    currentPriceSource: 'yahoo_finance',
    fairValueMid: 12,
    fairValueLow: 9,
    fairValueHigh: 13,
    upsidePct: 20,
    downsidePct: 10,
    marginOfSafetyPct: 16,
    dcf: { model: 'dcf', fairPrice: 12, source: 'computed', inputsUsedJa: [], unavailableReasonJa: null },
    ddm: null,
    per: { model: 'per', fairPrice: 11, source: 'computed', inputsUsedJa: [], unavailableReasonJa: null },
    fairValueScore: score,
    recommendation: rec,
    modelsUsed: ['dcf', 'per'],
    primaryFairValueModel: 'dcf',
    confidence: 'Medium',
    dcfUnavailableReasonCode: 'computed_ok',
    ddmUnavailableReasonCode: 'not_dividend_stock',
    fieldAcquisitionRate: 0.75,
    acquiredFieldCount: 6,
    totalFieldCount: 8,
    fieldSources: {},
    source: 'yahoo_finance',
    materialScoreAdjustment: 0,
    unavailableReason: null,
    displayJa: { fairValueScore: `${score}`, recommendation: rec } as never,
    evaluationJa: 'test',
    hasExtractableData: true,
    fetchedAt: '2026-06-11T00:00:00.000Z',
  };
}

function fairValueMaterialInput(rec: string) {
  return {
    source: 'bursa_announcement' as const,
    sourceLabelJa: 'Phase21 Fair Value Intelligence',
    title: `Fair Value ${rec} (+14)`,
    url: null,
    publishedAt: '2026-06-11T00:00:00.000Z',
    idSuffix: `phase21-fair-value-${rec.replace(/\s+/g, '-')}`,
  };
}
