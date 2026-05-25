import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BURSA_MARKET_OPEN_INSTANT } from '../helpers/marketOpenTime';
import {
  buildDataReliabilityBundle,
  computeSymbolDataQualityScore,
} from '../../src/services/dataReliabilityEngine';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';
import { createEmptyHealthSnapshot } from '../../src/services/apiHealthStorage';
import { buildApiHealthDashboard } from '../../src/services/apiHealthDashboard';

vi.mock('../../src/services/productionStability/storageIntegrity', () => ({
  runStorageIntegrityCheck: vi.fn(async () => ({
    checked: 4,
    corrupted: [],
    ok: true,
  })),
}));

function sym(overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol: '1155',
    companyName: 'Test',
    market: 'bursa',
    displayLabelJa: '1155',
    currentPrice: 10.5,
    previousClose: 10,
    intradayChangePct: 5,
    volume: 1000,
    volumeSurgeRatio: 1.2,
    quoteAgeSeconds: 120,
    quoteIsStale: false,
    portfolioHolding: null,
    latestFinancialNews: [
      {
        title: 'Headline A',
        sentiment: 'neutral',
        fetchedAtIso: new Date().toISOString(),
        ageSeconds: 3600,
      },
    ],
    newsSummaryJa: 'news',
    newsSource: 'test',
    xSentiment: {
      postCount: 10,
      bullishPct: 40,
      bearishPct: 30,
      panicPct: 10,
      hypePct: 20,
      trendWords: ['ai', 'growth'],
      postSurgeRatePct: null,
      summaryJa: 'x',
      analysisBasis: 'test',
      fromCache: false,
      fetchedAtIso: new Date().toISOString(),
      ageSeconds: 600,
    },
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('dataReliabilityEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BURSA_MARKET_OPEN_INSTANT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computeSymbolDataQualityScore deducts for stale and invalid', () => {
    const good = computeSymbolDataQualityScore({
      priceValid: true,
      quoteStale: false,
      newsStale: false,
      abnormalChange: false,
      badTick: false,
      volumeAnomaly: false,
      consensusWarn: false,
      closedMove: false,
      xLowReliability: false,
      duplicateNews: false,
    });
    expect(good).toBe(100);
    const bad = computeSymbolDataQualityScore({
      priceValid: false,
      quoteStale: true,
      newsStale: true,
      abnormalChange: true,
      badTick: false,
      volumeAnomaly: false,
      consensusWarn: false,
      closedMove: false,
      xLowReliability: true,
      duplicateNews: true,
    });
    expect(bad).toBeLessThan(45);
  });

  it('flags stale quote', async () => {
    const bundle = await buildDataReliabilityBundle({
      symbols: [sym({ quoteIsStale: true, quoteAgeSeconds: 60 * 60 })],
      apiHealth: buildApiHealthDashboard(createEmptyHealthSnapshot()),
    });
    expect(bundle.symbols[0].issues.some((i) => i.code === 'stale_quote')).toBe(true);
    expect(bundle.reliabilityTier).not.toBe('high');
  });

  it('detects bad tick on extreme move', async () => {
    const bundle = await buildDataReliabilityBundle({
      symbols: [sym({ intradayChangePct: 35 })],
      apiHealth: buildApiHealthDashboard(createEmptyHealthSnapshot()),
    });
    expect(bundle.symbols[0].issues.some((i) => i.code === 'bad_tick')).toBe(true);
  });

  it('closes AI gate when score too low', async () => {
    const bundle = await buildDataReliabilityBundle({
      symbols: [sym({ currentPrice: null, quoteIsStale: true })],
      apiHealth: buildApiHealthDashboard(createEmptyHealthSnapshot()),
    });
    expect(bundle.aiInputGateOpen).toBe(false);
    expect(bundle.safeFallbackJa).toContain('判断保留');
  });

  it('deduplicates news titles', async () => {
    const bundle = await buildDataReliabilityBundle({
      symbols: [
        sym({
          latestFinancialNews: [
            { title: 'Same', sentiment: 'n', ageSeconds: 100 },
            { title: 'Same', sentiment: 'n', ageSeconds: 200 },
          ],
        }),
      ],
      apiHealth: buildApiHealthDashboard(createEmptyHealthSnapshot()),
    });
    expect(bundle.duplicateGuardNoteJa).toContain('重複');
  });

  it('reports API health rows', async () => {
    const bundle = await buildDataReliabilityBundle({
      symbols: [sym()],
      apiHealth: buildApiHealthDashboard(createEmptyHealthSnapshot()),
    });
    expect(bundle.apiHealth.length).toBeGreaterThan(0);
  });
});
