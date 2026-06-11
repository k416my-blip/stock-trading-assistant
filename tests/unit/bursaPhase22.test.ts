import { describe, expect, it } from 'vitest';
import {
  classifyFairValueVsAnalyst,
  computeAnalystTargetScore,
  computeDownsidePct,
  computeFairValueVsAnalystDiffPct,
  computeUpsidePct,
  countAcquiredAnalystTargetFields,
  scoreAnalystTargetMaterialItem,
} from '../../src/services/bursa/bursaAnalystTargetIntelligenceService';
import {
  buildAnalystTargetFromConsensus,
  mergeAnalystTargetPartials,
} from '../../src/services/bursa/bursaAnalystTargetIntelligenceProviders';
import { enrichStockWithAnalystTargetIntelligence } from '../../src/services/bursa/bursaPhase22Analysis';
import {
  ANALYST_TARGET_SCORE_MAX,
  ANALYST_TARGET_SCORE_MIN,
} from '../../src/constants/bursaAnalystTargetIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';
import type { BursaAnalystTargetIntelligenceAnalysis } from '../../src/types/bursaAnalystTargetIntelligence';

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

function sampleAnalysis(overrides?: Partial<BursaAnalystTargetIntelligenceAnalysis>): BursaAnalystTargetIntelligenceAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    source: 'yahoo_finance',
    targetMedian: 12.01,
    targetMean: 12.1,
    bullCaseTarget: 14.5,
    bearCaseTarget: 9.8,
    coverageCount: 18,
    currentPrice: 10.2,
    upsidePct: 17.7,
    downsidePct: 3.9,
    targetRevisionTrend: 'Upgrade',
    recommendationDistribution: {
      strongBuy: 5,
      buy: 8,
      hold: 4,
      reduce: 1,
      sell: 0,
    },
    analystScore: 13,
    fairValueMid: 10.2,
    fairValueVsAnalystDiffPct: 17.7,
    fairValueVsAnalystJudgment: 'Analyst Bullish',
    displayJa: {
      targetMedian: 'RM 12.01',
      targetMean: 'RM 12.10',
      bullTarget: 'RM 14.50',
      bearTarget: 'RM 9.80',
      coverageCount: '18',
      currentPrice: 'RM 10.20',
      upsidePct: '+17.7%',
      downsidePct: '+3.9%',
      targetTrend: 'Upgrade（上方修正）',
      recommendationDistribution: 'SB:5 B:8 H:4 R:1 S:0',
      analystScore: '+13',
      fairValueMid: 'RM 10.20',
      fairValueVsAnalystDiffPct: '+17.7%',
      fairValueVsAnalystJudgment: 'Analyst Bullish（アナリスト上方）',
      fieldAcquisitionRate: '10/10',
      source: 'Yahoo Finance',
    },
    evaluationJa: 'Analyst Target Intelligence · Target RM 12.01 · +17.7%',
    hasExtractableData: true,
    fieldsAcquired: 10,
    fieldsTotal: 10,
    fetchedAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('bursaPhase22 analyst target intelligence', () => {
  it('computeUpsidePct calculates from target and current price', () => {
    expect(computeUpsidePct(12.01, 10.2)).toBeCloseTo(17.75, 1);
  });

  it('computeDownsidePct calculates bear case downside', () => {
    expect(computeDownsidePct(9.8, 10.2)).toBeCloseTo(3.92, 1);
  });

  it('computeAnalystTargetScore applies upside tiers and trend', () => {
    expect(
      computeAnalystTargetScore({
        upsidePct: 35,
        coverageCount: 18,
        targetRevisionTrend: 'Upgrade',
      }),
    ).toBe(13);
    expect(
      computeAnalystTargetScore({
        upsidePct: -5,
        coverageCount: 5,
        targetRevisionTrend: 'Downgrade',
      }),
    ).toBe(-6);
  });

  it('computeAnalystTargetScore stays within -20..+20', () => {
    const score = computeAnalystTargetScore({
      upsidePct: 50,
      coverageCount: 20,
      targetRevisionTrend: 'Upgrade',
    });
    expect(score).toBeGreaterThanOrEqual(ANALYST_TARGET_SCORE_MIN);
    expect(score).toBeLessThanOrEqual(ANALYST_TARGET_SCORE_MAX);
  });

  it('computeFairValueVsAnalystDiffPct matches user example', () => {
    const diff = computeFairValueVsAnalystDiffPct(10.2, 12.01);
    expect(diff).toBeCloseTo(17.75, 1);
    expect(classifyFairValueVsAnalyst(diff)).toBe('Analyst Bullish');
  });

  it('classifyFairValueVsAnalyst handles aligned and fair value bullish', () => {
    expect(classifyFairValueVsAnalyst(5)).toBe('Aligned');
    expect(classifyFairValueVsAnalyst(-15)).toBe('Fair Value Bullish');
    expect(classifyFairValueVsAnalyst(null)).toBe('Unavailable');
  });

  it('buildAnalystTargetFromConsensus maps Phase14 data', () => {
    const partial = buildAnalystTargetFromConsensus({
      availability: 'available',
      availabilityLabelJa: '取得済',
      source: 'yahoo_finance',
      rating: 'Buy',
      ratingCounts: {
        strongBuy: 3,
        buy: 5,
        hold: 2,
        sell: 1,
        strongSell: 0,
        analystCount: 11,
      },
      averageTargetPrice: 11.5,
      currentPrice: 10,
      targetPriceUpsidePct: 15,
      epsForecast: { currentFy: 1.2, nextFy: 1.3 },
      revenueForecast: { currentFy: null, nextFy: null },
      consensusTrend: 'Upgraded',
      confidenceScore: 80,
      displayJa: {
        rating: 'Buy',
        targetPrice: 'MYR 11.50',
        upside: '+15.0%',
        analystCount: '11',
        epsForecast: '—',
        revenueForecast: '—',
        trend: 'Upgraded',
        confidence: '80',
      },
      evaluationJa: 'test',
      hasRatingOrTarget: true,
      fetchedAt: null,
    });
    expect(partial?.source).toBe('analyst_consensus');
    expect(partial?.targetMedian).toBe(11.5);
    expect(partial?.targetRevisionTrend).toBe('Upgrade');
    expect(partial?.recommendationDistribution?.reduce).toBe(1);
  });

  it('mergeAnalystTargetPartials prefers Yahoo fields', () => {
    const merged = mergeAnalystTargetPartials([
      {
        source: 'yahoo_finance',
        targetMedian: 12,
        targetMean: 12.1,
        bullCaseTarget: 14,
        bearCaseTarget: 9.5,
        coverageCount: 16,
        currentPrice: 10,
        targetRevisionTrend: 'Stable',
        recommendationDistribution: null,
      },
      {
        source: 'analyst_consensus',
        targetMedian: 11,
        targetMean: 11,
        bullCaseTarget: null,
        bearCaseTarget: null,
        coverageCount: 10,
        currentPrice: null,
        targetRevisionTrend: 'Upgrade',
        recommendationDistribution: {
          strongBuy: 2,
          buy: 3,
          hold: 4,
          reduce: 1,
          sell: 0,
        },
      },
    ]);
    expect(merged?.source).toBe('yahoo_finance');
    expect(merged?.targetMedian).toBe(12);
    expect(merged?.targetRevisionTrend).toBe('Stable');
    expect(merged?.recommendationDistribution?.buy).toBe(3);
  });

  it('countAcquiredAnalystTargetFields counts up to 10 fields', () => {
    const count = countAcquiredAnalystTargetFields({
      targetMedian: 12,
      targetMean: 12.1,
      bullCaseTarget: 14,
      bearCaseTarget: 9.5,
      coverageCount: 16,
      currentPrice: 10,
      upsidePct: 20,
      downsidePct: 5,
      targetRevisionTrend: 'Upgrade',
      recommendationDistribution: {
        strongBuy: 1,
        buy: 2,
        hold: 3,
        reduce: 0,
        sell: 0,
      },
    });
    expect(count).toBe(10);
  });

  it('scoreAnalystTargetMaterialItem produces material item', () => {
    const analysis = sampleAnalysis();
    const item = scoreAnalystTargetMaterialItem(analysis, {
      id: 'phase22-analyst-target',
      title: 'test',
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase22 Analyst Target Intelligence',
      url: null,
      publishedAt: null,
    });
    expect(item.score).toBeGreaterThan(0);
    expect(item.sourceLabelJa).toContain('Phase22');
  });

  it('enrichStockWithAnalystTargetIntelligence skips live fetch when disabled', async () => {
    const stock = minimalStock('1023');
    stock.analystConsensus = {
      availability: 'available',
      availabilityLabelJa: '取得済',
      source: 'yahoo_finance',
      rating: 'Buy',
      ratingCounts: {
        strongBuy: 2,
        buy: 4,
        hold: 3,
        sell: 1,
        strongSell: 0,
        analystCount: 10,
      },
      averageTargetPrice: 8.5,
      currentPrice: 7.8,
      targetPriceUpsidePct: 9,
      epsForecast: { currentFy: null, nextFy: null },
      revenueForecast: { currentFy: null, nextFy: null },
      consensusTrend: 'Maintained',
      confidenceScore: 70,
      displayJa: {
        rating: 'Buy',
        targetPrice: 'MYR 8.50',
        upside: '+9.0%',
        analystCount: '10',
        epsForecast: '—',
        revenueForecast: '—',
        trend: 'Maintained',
        confidence: '70',
      },
      evaluationJa: 'consensus',
      hasRatingOrTarget: true,
      fetchedAt: null,
    };
    stock.fairValueIntelligence = {
      availability: 'available',
      availabilityLabelJa: '取得済',
      source: 'computed',
      currentPrice: 7.8,
      currentPriceSource: 'yahoo_finance',
      fairValueLow: 7,
      fairValueMid: 7.5,
      fairValueHigh: 8,
      upsidePct: -3.8,
      downsidePct: 3.8,
      marginOfSafetyPct: -3.8,
      fairValueScore: -2,
      recommendation: 'Hold',
      dcf: { model: 'dcf', fairPrice: null, unavailableReasonJa: 'no_fcf', source: 'none', inputsUsedJa: [] },
      ddm: { model: 'ddm', fairPrice: 7.5, unavailableReasonJa: null, source: 'yahoo_finance', inputsUsedJa: [] },
      per: { model: 'per', fairPrice: 7.8, unavailableReasonJa: null, source: 'yahoo_finance', inputsUsedJa: [] },
      modelsUsed: ['ddm', 'per'],
      primaryFairValueModel: 'ddm',
      confidence: 'Medium',
      dcfUnavailableReasonCode: 'fcf_missing',
      ddmUnavailableReasonCode: null,
      fieldAcquisitionRate: 0.67,
      acquiredFieldCount: 8,
      totalFieldCount: 12,
      fieldSources: {},
      hasExtractableData: true,
      materialScoreAdjustment: 0,
      unavailableReason: null,
      displayJa: {
        currentPrice: 'RM 7.80',
        fairValueMid: 'RM 7.50',
        fairValueLow: 'RM 7.00',
        fairValueHigh: 'RM 8.00',
        upsidePct: '-3.8%',
        downsidePct: '+3.8%',
        marginOfSafetyPct: '-3.8%',
        dcfFairPrice: '未取得',
        ddmFairPrice: 'RM 7.50',
        perFairPrice: 'RM 7.80',
        fairValueScore: '-2',
        recommendation: 'Hold',
        dcfSource: '未取得',
        ddmSource: 'Yahoo Finance',
        perSource: 'Yahoo Finance',
        priceSource: 'Yahoo Finance',
        fieldAcquisitionRate: '8/12',
        primarySource: 'Yahoo Finance',
        dcfUnavailableReason: 'FCF不足',
        ddmUnavailableReason: '—',
        modelsUsed: 'DDM, PER',
        primaryModel: 'DDM',
        confidence: '中',
      },
      evaluationJa: 'Fair Value Hold',
      fetchedAt: null,
    };

    const enriched = await enrichStockWithAnalystTargetIntelligence({
      stock,
      fetchLiveExternal: false,
    });

    expect(enriched.analystTargetIntelligence?.availability).toBe('available');
    expect(enriched.analystTargetIntelligence?.targetMean).toBe(8.5);
    expect(enriched.analystTargetIntelligence?.fairValueMid).toBe(7.5);
    expect(enriched.fetchedFields).toContain('phase22.analyst_target_intelligence');
    const phase22Material = [
      ...(enriched.positiveMaterials ?? []),
      ...(enriched.negativeMaterials ?? []),
      ...(enriched.neutralMaterials ?? []),
    ].find((m) => m.id === 'phase22-analyst-target');
    expect(phase22Material).toBeDefined();
  });
});
