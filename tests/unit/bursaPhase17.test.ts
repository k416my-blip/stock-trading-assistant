import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildDividendIntelligenceAnalysis,
  dividendIntelligenceMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaDividendIntelligenceService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA } from '../../src/types/bursaDividendIntelligence';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');

describe('bursaDividendIntelligence Phase17', () => {
  it('parses dividend history from KLSE fixture', () => {
    const parsed = parseBursaDividendFromHtml(stockFixture, '1155');
    expect(parsed.history.length).toBeGreaterThan(0);
  });

  it('builds dividend intelligence from fixture without speculation', async () => {
    const result = await buildDividendIntelligenceAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      fetchLiveExternal: true,
    });
    expect(result.hasExtractableData).toBe(true);
    expect(['yahoo_finance', 'fmp', 'alpha_vantage', 'klse_dividend']).toContain(result.source);
    expect(result.fieldAcquisitionRate).toBeGreaterThan(0);
    expect(result.evaluationJa).toContain('Dividend Intelligence');
    expect(result.evaluationJa).toContain('取得率');
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildDividendIntelligenceAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      fetchLiveExternal: false,
    });
    expect(result.evaluationJa).toBe(DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA);
  });

  it('material score adjustment is auxiliary bounded', () => {
    const high = dividendIntelligenceMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: '取得済',
      dividendYield: 5,
      payoutRatio: 50,
      dividendGrowthRate: 10,
      consecutiveDividendYears: 5,
      fiveYearCagr: 8,
      exDividendDate: '2026-01-01',
      paymentDate: '2026-01-15',
      dividendFrequency: '年2回',
      specialDividend: false,
      dividendSustainabilityScore: 80,
      source: 'yahoo_finance',
      fieldAcquisitionRate: 0.85,
      fieldSources: { dividendYield: 'yahoo_finance', payoutRatio: 'yahoo_finance' },
      materialWeightMax: 7.2,
      unavailableReason: null,
      displayJa: {} as never,
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    });
    expect(high).toBeGreaterThan(0);
    expect(high).toBeLessThanOrEqual(8);
  });
});
