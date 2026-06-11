import { describe, expect, it } from 'vitest';
import {
  classifyAnalystDivergence,
  computeAnalystDivergencePct,
  evaluateConservativeBias,
  evaluateModelValidationPass,
} from '../../src/services/bursa/bursaFairValueModelValidationService';
import type { FairValueModelValidationRow } from '../../src/services/bursa/bursaFairValueModelValidationService';

function mockRow(overrides: Partial<FairValueModelValidationRow> = {}): FairValueModelValidationRow {
  return {
    stockCode: '1155',
    label: 'Maybank',
    sector: 'Banking',
    fairValueMid: 7.25,
    analystTarget: 12.01,
    analystSource: 'Yahoo Finance',
    divergencePct: -39.6,
    divergenceBand: 'beyond_30',
    divergenceBandJa: '±30%超',
    growthHorizons: {
      oneYear: { valuePct: 2.0, sourceJa: 'Bursa', detailJa: 'test' },
      threeYearAvg: { valuePct: 3.0, sourceJa: 'Bursa', detailJa: 'test' },
      fiveYearAvg: { valuePct: 4.0, sourceJa: 'Phase17', detailJa: 'test' },
      financialReportProfitYoY: { valuePct: -3.6, sourceJa: 'FR', detailJa: 'test' },
      adoptedInDdm: { valuePct: -3.6, sourceJa: 'Financial Report', detailJa: 'test' },
    },
    bankNegativeGrowthExplanationJa: ['reason'],
    perpetualGrowthAssessmentJa: ['bad'],
    conservativeBiasContributionJa: ['bias'],
    ...overrides,
  };
}

describe('bursaPhase21.7 model validation', () => {
  it('computeAnalystDivergencePct: FV below analyst is negative', () => {
    const pct = computeAnalystDivergencePct(7.25, 12.01);
    expect(pct).not.toBeNull();
    expect(pct!).toBeLessThan(-30);
  });

  it('classifyAnalystDivergence bands', () => {
    expect(classifyAnalystDivergence(5).band).toBe('within_10');
    expect(classifyAnalystDivergence(-15).band).toBe('within_20');
    expect(classifyAnalystDivergence(-25).band).toBe('within_30');
    expect(classifyAnalystDivergence(-40).band).toBe('beyond_30');
  });

  it('evaluateConservativeBias detects bias when avg gap large', () => {
    const rows = [
      mockRow({ stockCode: '1155', divergencePct: -39 }),
      mockRow({ stockCode: '1023', divergencePct: -39 }),
      mockRow({ stockCode: '1295', divergencePct: -35 }),
      mockRow({ stockCode: '5347', divergencePct: 10 }),
      mockRow({ stockCode: '4707', divergencePct: -30 }),
      mockRow({ stockCode: '6033', divergencePct: -40 }),
    ];
    const v = evaluateConservativeBias(rows);
    expect(v.exists).toBe(true);
    expect(v.stocksBeyond30Pct).toBeGreaterThanOrEqual(4);
  });

  it('evaluateModelValidationPass requires 6 stocks and bank explanations', () => {
    const codes = ['1155', '1023', '1295', '5347', '4707', '6033'];
    const rows = codes.map((code) =>
      mockRow({
        stockCode: code,
        bankNegativeGrowthExplanationJa: ['1155', '1023', '1295'].includes(code) ? ['ok'] : [],
      }),
    );
    expect(evaluateModelValidationPass(rows).pass).toBe(true);
  });
});
