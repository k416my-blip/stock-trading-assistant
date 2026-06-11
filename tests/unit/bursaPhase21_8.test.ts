import { describe, expect, it } from 'vitest';
import {
  clipDdmGrowthPct,
  collectDdmGrowthCandidates,
  resolveDdmGrowthRate,
  resolveLegacyFrProfitDdmGrowth,
} from '../../src/services/bursa/bursaDdmGrowthResolver';
import { recomputeFairValueSnapshot } from '../../src/services/bursa/bursaFairValueIntelligenceService';
import { computeAnalystDivergencePct } from '../../src/services/bursa/bursaFairValueModelValidationService';

describe('bursaPhase21.8 DDM correction', () => {
  it('clipDdmGrowthPct enforces floor -2% and ceiling r-2%', () => {
    const low = clipDdmGrowthPct(-5, 0.09);
    expect(low.clippedPct).toBe(-2);
    expect(low.clipApplied).toBe(true);

    const high = clipDdmGrowthPct(10, 0.09);
    expect(high.clippedPct).toBeCloseTo(7, 1);
    expect(high.clipApplied).toBe(true);
  });

  it('resolveDdmGrowthRate prefers 5y dividend CAGR over FR profit', () => {
    const bundle = {
      stockCode: '1155',
      profile: { stockCode: '1155', eps: 0.86 } as never,
      quarterly: { stockCode: '1155', quarterlyHistory: [], annualRecords: [] } as never,
      dividend: {
        stockCode: '1155',
        history: [
          { amountPerShare: 0.63, financialYear: '2025' },
          { amountPerShare: 0.61, financialYear: '2024' },
          { amountPerShare: 0.58, financialYear: '2023' },
          { amountPerShare: 0.55, financialYear: '2022' },
          { amountPerShare: 0.52, financialYear: '2021' },
        ],
      } as never,
    } as never;

    const resolved = resolveDdmGrowthRate({
      bundle,
      financialReport: {
        hasExtractableData: true,
        extracted: { profitGrowth: { growthPct: -3.6, growthLabelJa: '-3.6%' } },
      } as never,
      dividendIntelligence: { fiveYearCagr: 2.8, hasExtractableData: true } as never,
      sector: 'Banking',
    });

    expect(resolved.adoptedKey).toBe('five_year_dividend_cagr');
    expect(resolved.adoptedPct).toBeCloseTo(2.8, 1);
    expect(resolved.adoptedPct).toBeGreaterThan(-2);
  });

  it('legacy FR profit g is more conservative than corrected g for banks', () => {
    const legacy = resolveLegacyFrProfitDdmGrowth({
      financialReport: { extracted: { profitGrowth: { growthPct: -3.6 } } } as never,
      fallbackPct: null,
      sector: 'Banking',
    });
    const corrected = 2.8;
    const inputs = {
      currentPrice: 10.68,
      freeCashflow: null,
      freeCashflowIsOperatingProxy: false,
      fcfGrowth: null,
      earningsGrowth: null,
      sharesOutstanding: null,
      dividendYield: 6.18,
      dividendPerShare: 0.66,
      dividendGrowth: null,
      trailingEps: 0.86,
    };
    const before = recomputeFairValueSnapshot({
      inputs,
      sector: 'Banking',
      fieldSources: {},
      ddmGrowthPct: legacy,
    });
    const after = recomputeFairValueSnapshot({
      inputs,
      sector: 'Banking',
      fieldSources: {},
      ddmGrowthPct: corrected,
    });
    expect(after.ddm?.fairPrice).not.toBeNull();
    expect(before.ddm?.fairPrice).not.toBeNull();
    expect(after.ddm!.fairPrice!).toBeGreaterThan(before.ddm!.fairPrice!);
    expect(after.fairValueMid!).toBeGreaterThan(before.fairValueMid!);
  });

  it('analyst divergence improves when fair value rises toward target', () => {
    const target = 12.01;
    const beforeDiv = computeAnalystDivergencePct(7.25, target)!;
    const afterDiv = computeAnalystDivergencePct(9.5, target)!;
    expect(afterDiv).toBeGreaterThan(beforeDiv);
  });
});
