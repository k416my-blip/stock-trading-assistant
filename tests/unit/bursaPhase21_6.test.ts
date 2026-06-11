import { describe, expect, it } from 'vitest';
import {
  explainFairValueScoreBreakdown,
  buildAvoidExplanationJa,
  buildDdmValidationInputs,
  evaluateFairValueValidationPass,
} from '../../src/services/bursa/bursaFairValueValidationService';
import type { BursaFairValueIntelligenceAnalysis } from '../../src/types/bursaFairValueIntelligence';

function mockAnalysis(overrides: Partial<BursaFairValueIntelligenceAnalysis> = {}): BursaFairValueIntelligenceAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    currentPrice: 10.68,
    currentPriceSource: 'yahoo_finance',
    fairValueMid: 7.25,
    fairValueLow: 5.04,
    fairValueHigh: 9.46,
    upsidePct: -32.1,
    downsidePct: 47.2,
    marginOfSafetyPct: -47.3,
    dcf: { model: 'dcf', fairPrice: null, source: 'none', inputsUsedJa: [], unavailableReasonJa: 'FCF未取得' },
    ddm: { model: 'ddm', fairPrice: 5.04, source: 'computed', inputsUsedJa: [], unavailableReasonJa: null },
    per: { model: 'per', fairPrice: 9.46, source: 'computed', inputsUsedJa: [], unavailableReasonJa: null },
    fairValueScore: -15,
    recommendation: 'Avoid',
    modelsUsed: ['ddm', 'per'],
    primaryFairValueModel: 'ddm',
    confidence: 'High',
    dcfUnavailableReasonCode: 'fcf_missing',
    ddmUnavailableReasonCode: 'computed_ok',
    fieldAcquisitionRate: 0.75,
    acquiredFieldCount: 6,
    totalFieldCount: 9,
    fieldSources: { dividendGrowth: 'phase17_dividend', dividendYield: 'phase17_dividend' },
    source: 'yahoo_finance',
    materialScoreAdjustment: 0,
    unavailableReason: null,
    displayJa: {
      currentPrice: 'RM 10.68',
      fairValueMid: 'RM 7.25',
      fairValueLow: 'RM 5.04',
      fairValueHigh: 'RM 9.46',
      upsidePct: '-32.1%',
      downsidePct: '+47.2%',
      marginOfSafetyPct: '-47.3%',
      dcfFairPrice: '未取得',
      ddmFairPrice: 'RM 5.04',
      perFairPrice: 'RM 9.46',
      fairValueScore: '-15',
      recommendation: 'Avoid',
      dcfSource: '未取得',
      ddmSource: '算出',
      perSource: '算出',
      priceSource: 'Yahoo Finance',
      fieldAcquisitionRate: '75%',
      primarySource: 'Yahoo Finance',
      dcfUnavailableReason: 'FCF未取得',
      ddmUnavailableReason: '算出成功',
      modelsUsed: 'DDM + PER補完',
      primaryModel: 'DDM',
      confidence: 'High',
    },
    evaluationJa: 'test',
    hasExtractableData: true,
    fetchedAt: '2026-06-11T00:00:00.000Z',
    ...overrides,
  };
}

describe('bursaPhase21.6 fair value validation', () => {
  it('explainFairValueScoreBreakdown yields Avoid for large negative upside', () => {
    const b = explainFairValueScoreBreakdown(mockAnalysis());
    expect(b.recommendation).toBe('Avoid');
    expect(b.score).toBeLessThanOrEqual(-12);
    expect(b.stepsJa.some((s) => s.includes('Upside'))).toBe(true);
  });

  it('buildAvoidExplanationJa includes premium and model breakdown', () => {
    const lines = buildAvoidExplanationJa(mockAnalysis(), 'Maybank');
    const text = lines.join('\n');
    expect(text).toContain('Maybank');
    expect(text).toContain('Avoid');
    expect(text).toContain('RM 10.68');
    expect(text).toContain('RM 7.25');
    expect(text).toContain('プレミアム');
  });

  it('buildDdmValidationInputs computes Gordon Growth formula', () => {
    const ddm = buildDdmValidationInputs({
      rawInputs: {
        currentPrice: 10.68,
        freeCashflow: null,
        freeCashflowIsOperatingProxy: false,
        fcfGrowth: null,
        earningsGrowth: null,
        sharesOutstanding: null,
        dividendYield: 5.5,
        dividendPerShare: 0.58,
        dividendGrowth: 3.2,
        trailingEps: 0.86,
      },
      sector: 'Banking',
      fieldSources: { dividendGrowth: 'phase17_dividend', dividendYield: 'yahoo_finance' },
      ddmFairPrice: 5.04,
    });
    expect(ddm).not.toBeNull();
    expect(ddm!.requiredReturnPct).toBe(9);
    expect(ddm!.formulaJa).toContain('P = D₁');
  });

  it('evaluateFairValueValidationPass requires 6 stocks and explanations', () => {
    const detail = {
      stockCode: '1155',
      avoidExplanationJa: ['test'],
      scoreBreakdown: { score: -15, recommendation: 'Avoid' as const, stepsJa: [] },
      ddmInputs: {
        dividendPerShare: 0.5,
        dividendYieldPct: 5,
        dividendGrowthPct: 3,
        requiredReturnPct: 9,
        d1: 0.515,
        formulaJa: 'P=...',
        sourceJa: 'test',
      },
      formulaLinesJa: ['a', 'b', 'c'],
      confidenceCriteriaAppliedJa: 'High',
      analystTargetPrice: 11,
      analystTargetSource: 'Yahoo',
      analystVsFairValueJa: 'compare',
    };
    const fail = evaluateFairValueValidationPass({ details: [detail] });
    expect(fail.pass).toBe(false);

    const pass = evaluateFairValueValidationPass({
      details: [
        detail,
        { ...detail, stockCode: '1023' },
        { ...detail, stockCode: '1295' },
        { ...detail, stockCode: '5347' },
        { ...detail, stockCode: '4707', ddmInputs: null },
        { ...detail, stockCode: '6033' },
      ],
    });
    expect(pass.pass).toBe(true);
  });
});
