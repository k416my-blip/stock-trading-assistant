import { describe, expect, it } from 'vitest';
import {
  computeAnalystConsensusScore,
  collectAnalystConsensusWarnings,
  resolveAnalystConsensusConfidence,
} from '../../src/services/bursa/bursaAnalystConsensusIntelligenceService';
import {
  buildAnalystConsensusPartialFromPhase14,
  mergeAnalystConsensusIntelligencePartials,
  MOCK_ANALYST_CONSENSUS_FIXTURE,
} from '../../src/services/bursa/bursaAnalystConsensusIntelligenceProviders';
import { enrichStockWithAnalystConsensusIntelligence } from '../../src/services/bursa/bursaPhase24Analysis';
import {
  ANALYST_CONSENSUS_SCORE_MAX,
  ANALYST_CONSENSUS_SCORE_MIN,
} from '../../src/constants/bursaAnalystConsensusIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

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

describe('bursaPhase24 analyst consensus intelligence', () => {
  it('computeAnalystConsensusScore rewards high buy ratio and upside', () => {
    const score = computeAnalystConsensusScore({
      analystCount: 18,
      buyCount: 14,
      holdCount: 3,
      sellCount: 1,
      impliedUpsidePct: 18,
      targetRevisionDirection: 'Upgraded',
      targetRevisionPct: 6,
      ratingRevisionDirection: 'Upgraded',
    });
    expect(score).toBeGreaterThan(10);
    expect(score).toBeLessThanOrEqual(ANALYST_CONSENSUS_SCORE_MAX);
  });

  it('computeAnalystConsensusScore penalizes high sell ratio and downside', () => {
    const score = computeAnalystConsensusScore({
      analystCount: 12,
      buyCount: 2,
      holdCount: 3,
      sellCount: 7,
      impliedUpsidePct: -18,
      targetRevisionDirection: 'Downgraded',
      targetRevisionPct: -8,
      ratingRevisionDirection: 'Downgraded',
    });
    expect(score).toBeLessThan(-10);
    expect(score).toBeGreaterThanOrEqual(ANALYST_CONSENSUS_SCORE_MIN);
  });

  it('resolveAnalystConsensusConfidence lowers confidence for low analyst count', () => {
    expect(
      resolveAnalystConsensusConfidence({
        analystCount: 2,
        consensusDispersion: 20,
        fieldCount: 6,
        hasTargetAndPrice: true,
        warnings: [],
      }),
    ).toBe('Low');
  });

  it('resolveAnalystConsensusConfidence lowers confidence for high dispersion', () => {
    expect(
      resolveAnalystConsensusConfidence({
        analystCount: 12,
        consensusDispersion: 70,
        fieldCount: 10,
        hasTargetAndPrice: true,
        warnings: ['high_dispersion'],
      }),
    ).toBe('Medium');
  });

  it('collectAnalystConsensusWarnings flags missing target and stale data', () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
    const warnings = collectAnalystConsensusWarnings({
      partial: {
        ...MOCK_ANALYST_CONSENSUS_FIXTURE,
        targetPrice: null,
        updatedAt: staleDate,
      },
    });
    expect(warnings).toContain('missing_target_price');
    expect(warnings).toContain('stale_data');
  });

  it('mergeAnalystConsensusIntelligencePartials prefers mock revision fields over phase14', () => {
    const phase14 = buildAnalystConsensusPartialFromPhase14({
      availability: 'available',
      rating: 'Buy',
      ratingCounts: { strongBuy: 3, buy: 8, hold: 5, sell: 1, strongSell: 0, analystCount: 17 },
      averageTargetPrice: 11.5,
      currentPrice: 10.1,
      targetPriceUpsidePct: 13.9,
      epsForecast: { currentFy: 1.1, nextFy: 1.2 },
      revenueForecast: { currentFy: null, nextFy: null },
      consensusTrend: 'Maintained',
      confidenceScore: 70,
      displayJa: {} as never,
      evaluationJa: '',
      hasRatingOrTarget: true,
      fetchedAt: new Date().toISOString(),
      availabilityLabelJa: '',
      source: 'yahoo_finance',
    });
    const merged = mergeAnalystConsensusIntelligencePartials([
      phase14!,
      { ...MOCK_ANALYST_CONSENSUS_FIXTURE },
    ]);
    expect(merged?.targetRevisionDirection).toBe('Upgraded');
    expect(merged?.analystCount).toBe(17);
    expect(merged?.source).toBe('phase14_consensus');
  });

  it('enrichStockWithAnalystConsensusIntelligence uses mock fixture without external API', async () => {
    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock: minimalStock(),
      useMockFixture: true,
      fetchLiveExternal: false,
    });
    expect(enriched.analystConsensusIntelligence?.availability).toBe('available');
    expect(enriched.analystConsensusIntelligence?.consensusScore).toBeGreaterThan(0);
    expect(enriched.fetchedFields).toContain('phase24.analyst_consensus_intelligence');
  });

  it('enrichStockWithAnalystConsensusIntelligence returns unavailable without mock or phase14', async () => {
    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock: minimalStock('9999'),
      useMockFixture: false,
      fetchLiveExternal: false,
    });
    expect(enriched.analystConsensusIntelligence?.availability).toBe('unavailable');
    expect(enriched.missingFields).toContain('phase24.analyst_consensus_intelligence');
  });
});
