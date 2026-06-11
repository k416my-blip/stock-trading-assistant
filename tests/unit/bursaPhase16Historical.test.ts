import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  applyHistoricalToInstitutionalTrend,
  buildHistoricalOwnershipAnalysis,
  buildOwnershipHistoryRecords,
  pickTrendDirectionFromWindows,
} from '../../src/services/bursa/bursaHistoricalOwnershipService';
import { parseInstitutionalOwnershipFromHtml } from '../../src/services/bursa/bursaInstitutionalOwnershipParser';
import { classifyTrendDirection } from '../../src/services/bursa/bursaInstitutionalTrendParser';
import { HISTORICAL_OWNERSHIP_UNAVAILABLE_JA } from '../../src/types/bursaHistoricalOwnership';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
const shareholdingsFixture = readFileSync(
  join(process.cwd(), 'scripts/klse-shareholdings-1155.html'),
  'utf8',
);

describe('bursaHistoricalOwnership Phase16.6', () => {
  it('builds ownership history records with changePercent', () => {
    const snapshots = parseInstitutionalOwnershipFromHtml({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
    });
    const history = buildOwnershipHistoryRecords(snapshots);
    expect(history.length).toBeGreaterThan(5);
    expect(history[0]?.recordDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(history[0]?.holderName).toBeTruthy();
  });

  it('picks trend direction from 12M > 6M > 3M windows', () => {
    expect(
      pickTrendDirectionFromWindows({
        threeMonthTrend: 1,
        sixMonthTrend: 5,
        twelveMonthTrend: 12,
      }),
    ).toBe('Strong Accumulation');
    expect(
      pickTrendDirectionFromWindows({
        threeMonthTrend: null,
        sixMonthTrend: -5,
        twelveMonthTrend: null,
      }),
    ).toBe('Distribution');
  });

  it('builds historical analysis from fixtures', async () => {
    const result = await buildHistoricalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    expect(result.hasExtractableData).toBe(true);
    expect(result.ownershipHistory.length).toBeGreaterThan(0);
    expect(
      result.threeMonthTrend != null ||
        result.sixMonthTrend != null ||
        result.twelveMonthTrend != null,
    ).toBe(true);
    expect(result.trendDirection).toBeTruthy();
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildHistoricalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      fetchLiveExternal: false,
    });
    expect(result.evaluationJa).toBe(HISTORICAL_OWNERSHIP_UNAVAILABLE_JA);
  });

  it('applies historical windows to institutional trend', () => {
    const updated = applyHistoricalToInstitutionalTrend(
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        previousHoldingPercent: 50,
        currentHoldingPercent: 50,
        changePercent: 0,
        threeMonthTrend: null,
        sixMonthTrend: null,
        twelveMonthTrend: null,
        trendDirection: 'Neutral',
        trendConfidence: 50,
        source: 'klse_shareholdings_page',
        unavailableReason: null,
        displayJa: {
          previousHoldingPercent: '50%',
          currentHoldingPercent: '50%',
          changePercent: '0%',
          threeMonthTrend: '未取得',
          sixMonthTrend: '未取得',
          twelveMonthTrend: '未取得',
          trendDirection: 'Neutral',
          trendConfidence: '50',
        },
        evaluationJa: 'before',
        hasExtractableData: true,
        fetchedAt: null,
      },
      {
        availability: 'available',
        availabilityLabelJa: '取得済',
        ownershipHistory: [],
        threeMonthTrend: 11,
        sixMonthTrend: null,
        twelveMonthTrend: null,
        trendDirection: classifyTrendDirection(11),
        trendConfidence: 80,
        source: 'klse_shareholdings_history',
        unavailableReason: null,
        displayJa: {
          recordCount: '10',
          threeMonthTrend: '+11%',
          sixMonthTrend: '未取得',
          twelveMonthTrend: '未取得',
          trendDirection: 'Strong Accumulation',
          trendConfidence: '80',
          topHistory: 'KWAP',
        },
        evaluationJa: 'hist',
        hasExtractableData: true,
        fetchedAt: null,
      },
    );
    expect(updated.trendDirection).toBe('Strong Accumulation');
    expect(updated.threeMonthTrend).toBe(11);
    expect(updated.evaluationJa).toContain('3M');
  });
});
