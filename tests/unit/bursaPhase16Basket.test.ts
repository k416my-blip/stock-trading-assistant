import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  applyFixedBasketToHistoricalOwnership,
  buildFixedInstitutionalBasketAnalysis,
  computeFixedBasketWindowTrend,
} from '../../src/services/bursa/bursaFixedInstitutionalBasketService';
import { buildHistoricalOwnershipAnalysis } from '../../src/services/bursa/bursaHistoricalOwnershipService';
import { parseInstitutionalOwnershipFromHtml } from '../../src/services/bursa/bursaInstitutionalOwnershipParser';
import { FIXED_BASKET_UNAVAILABLE_JA } from '../../src/types/bursaFixedInstitutionalBasket';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
const shareholdingsFixture = readFileSync(
  join(process.cwd(), 'scripts/klse-shareholdings-1155.html'),
  'utf8',
);

describe('bursaFixedInstitutionalBasket Phase16.7', () => {
  it('computes paired-institution window trend only', () => {
    const snapshots = parseInstitutionalOwnershipFromHtml({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
    });
    const ref = new Date('2026-06-10T00:00:00Z');
    const result = computeFixedBasketWindowTrend(snapshots, ref, 365);
    if (result.trend != null) {
      expect(result.pairedInstitutions.length).toBeGreaterThan(0);
      expect(Math.abs(result.trend)).toBeLessThan(500);
    }
  });

  it('builds fixed basket analysis with legacy comparison', async () => {
    const historical = await buildHistoricalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    const basket = await buildFixedInstitutionalBasketAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      legacyHistorical: historical,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    expect(basket.hasExtractableData).toBe(true);
    expect(basket.basketMode).toBe('top30');
    expect(basket.comparisons).toHaveLength(3);
    expect(basket.pairedInstitutionCount).toBeGreaterThan(0);
    expect(basket.evaluationJa).toContain('TOP30 Basket');
    const legacy12 = basket.comparisons.find((c) => c.window === '12M');
    if (legacy12?.legacyTrendPct != null && legacy12.fixedBasketTrendPct != null) {
      expect(Math.abs(legacy12.legacyTrendPct)).toBeGreaterThanOrEqual(
        Math.abs(legacy12.fixedBasketTrendPct) * 0.01,
      );
    }
  });

  it('applies fixed basket correction to historical ownership', async () => {
    const historical = await buildHistoricalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    const basket = await buildFixedInstitutionalBasketAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      legacyHistorical: historical,
      fetchLiveExternal: true,
      referenceDate: new Date('2026-06-10T00:00:00Z'),
    });
    const corrected = applyFixedBasketToHistoricalOwnership(historical, basket);
    expect(corrected.evaluationJa).toContain('TOP30 Basket補正');
    if (basket.twelveMonthTrend != null) {
      expect(corrected.twelveMonthTrend).toBe(basket.twelveMonthTrend);
    }
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildFixedInstitutionalBasketAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHistoryHtml: shareholdingsFixture,
      fetchLiveExternal: false,
    });
    expect(result.evaluationJa).toBe(FIXED_BASKET_UNAVAILABLE_JA);
  });
});
