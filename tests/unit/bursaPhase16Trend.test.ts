import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildInstitutionalAggregateSeries,
  classifyTrendDirection,
  relativeChangePercent,
} from '../../src/services/bursa/bursaInstitutionalTrendParser';
import { parseInstitutionalOwnershipFromHtml } from '../../src/services/bursa/bursaInstitutionalOwnershipParser';
import {
  buildInstitutionalTrendAnalysis,
  institutionalTrendMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaInstitutionalTrendService';
import { INSTITUTIONAL_TREND_UNAVAILABLE_JA } from '../../src/types/bursaInstitutionalTrend';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
const shareholdingsFixture = readFileSync(
  join(process.cwd(), 'scripts/klse-shareholdings-1155.html'),
  'utf8',
);

describe('bursaInstitutionalTrendParser Phase16.5', () => {
  it('classifies trend direction from relative change', () => {
    expect(classifyTrendDirection(12)).toBe('Strong Accumulation');
    expect(classifyTrendDirection(5)).toBe('Accumulation');
    expect(classifyTrendDirection(0)).toBe('Neutral');
    expect(classifyTrendDirection(-5)).toBe('Distribution');
    expect(classifyTrendDirection(-12)).toBe('Strong Distribution');
  });

  it('computes relative change percent', () => {
    expect(relativeChangePercent(11, 10)).toBeCloseTo(10, 1);
    expect(relativeChangePercent(9, 10)).toBeCloseTo(-10, 1);
  });

  it('builds aggregate series with 2+ points from fixture', () => {
    const snapshots = parseInstitutionalOwnershipFromHtml({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
    });
    const series = buildInstitutionalAggregateSeries(snapshots);
    expect(series.length).toBeGreaterThanOrEqual(2);
  });
});

describe('bursaInstitutionalTrendService Phase16.5', () => {
  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildInstitutionalTrendAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(INSTITUTIONAL_TREND_UNAVAILABLE_JA);
  });

  it('builds trend from fixtures', async () => {
    const result = await buildInstitutionalTrendAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    expect(result.hasExtractableData).toBe(true);
    expect(result.changePercent).not.toBeNull();
    expect(result.trendDirection).not.toBeNull();
    expect(result.evaluationJa).toContain('Institutional Trend');
  });

  it('applies adaptive material score by trend direction', () => {
    const adj = institutionalTrendMaterialScoreAdjustment(
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        previousHoldingPercent: 40,
        currentHoldingPercent: 44,
        changePercent: 10,
        threeMonthTrend: 5,
        sixMonthTrend: null,
        twelveMonthTrend: null,
        trendDirection: 'Accumulation',
        trendConfidence: 80,
        source: 'klse_shareholdings_page',
        unavailableReason: null,
        displayJa: {
          previousHoldingPercent: '40%',
          currentHoldingPercent: '44%',
          changePercent: '+10%',
          threeMonthTrend: '+5%',
          sixMonthTrend: '未取得',
          twelveMonthTrend: '未取得',
          trendDirection: 'Accumulation',
          trendConfidence: '80',
        },
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      },
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        basketMode: 'top30',
        basketMaxSize: 30,
        pairedInstitutionCount: 6,
        pairedInstitutions: [],
        legacy8PairedCount: 4,
        legacy8TwelveMonthTrend: 1,
        threeMonthTrend: 5,
        sixMonthTrend: null,
        twelveMonthTrend: null,
        trendDirection: 'Accumulation',
        trendConfidence: 80,
        comparisons: [],
        unavailableReason: null,
        displayJa: {} as never,
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      },
    );
    expect(adj).toBeGreaterThan(2);
    expect(adj).toBeLessThanOrEqual(6);
  });
});
