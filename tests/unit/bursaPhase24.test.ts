import { describe, expect, it } from 'vitest';
import {
  buildJapaneseEvaluationJa,
  computeAnalystConsensusScore,
  computeBuyHoldSellBalance,
  computeImpliedUpside,
  collectAnalystConsensusWarnings,
  resolveAnalystConsensusConfidence,
  buildAnalystConsensusIntelligenceAnalysis,
} from '../../src/services/bursa/bursaAnalystConsensusIntelligenceService';
import {
  AUDIT_MOCK_FIXTURES,
  buildAnalystConsensusPartialFromPhase14,
  createUnavailableProvider,
  fetchAllAnalystConsensusIntelligencePartials,
  getMockFixtureForStock,
  mergeAnalystConsensusIntelligencePartials,
  MOCK_ANALYST_CONSENSUS_FIXTURE,
} from '../../src/services/bursa/bursaAnalystConsensusIntelligenceProviders';
import { enrichStockWithAnalystConsensusIntelligence } from '../../src/services/bursa/bursaPhase24Analysis';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../../src/constants/bursaAnalystConsensusIntelligence';
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

  it('computeImpliedUpside derives from target and current price', () => {
    expect(computeImpliedUpside(11.0, 10.0, null)).toBeCloseTo(10, 1);
    expect(computeImpliedUpside(null, 10.0, null)).toBeNull();
    expect(computeImpliedUpside(11.0, null, null)).toBeNull();
    expect(computeImpliedUpside(11.0, 10.0, 12.5)).toBe(12.5);
  });

  it('computeBuyHoldSellBalance formats Japanese label', () => {
    const balance = computeBuyHoldSellBalance({
      analystCount: 10,
      buyCount: 6,
      holdCount: 3,
      sellCount: 1,
    });
    expect(balance.buyPct).toBeCloseTo(60, 0);
    expect(balance.labelJa).toContain('Buy 60%');
  });

  it('buildJapaneseEvaluationJa includes consensus and warnings', () => {
    const ja = buildJapaneseEvaluationJa({
      consensusRating: 'Buy（買い）',
      buyHoldSellLabelJa: 'Buy 60% / Hold 30% / Sell 10%',
      targetPrice: 'MYR 11.00',
      currentPrice: 'MYR 10.00',
      impliedUpsidePct: '+10.0%',
      targetRevisionDirection: 'Upgraded（上方改定）',
      consensusScore: '+12',
      confidence: 'High',
      warnings: ['high_dispersion'],
    });
    expect(ja).toContain('アナリスト・コンセンサス評価');
    expect(ja).toContain('high_dispersion');
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

  it('mergeAnalystConsensusIntelligencePartials prefers phase14 base with mock revision fill', () => {
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

  it('merge priority ranks yahoo phase14 above mock_fixture', () => {
    const yahooLike: typeof MOCK_ANALYST_CONSENSUS_FIXTURE = {
      ...MOCK_ANALYST_CONSENSUS_FIXTURE,
      source: 'yahoo_finance',
      analystCount: 20,
    };
    const mock = { ...MOCK_ANALYST_CONSENSUS_FIXTURE, analystCount: 5 };
    const merged = mergeAnalystConsensusIntelligencePartials([mock, yahooLike]);
    expect(merged?.source).toBe('yahoo_finance');
    expect(merged?.analystCount).toBe(20);
  });

  it('provider error with no data yields safe unavailable analysis', async () => {
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: '9999',
      useMockFixture: false,
      fetchLiveExternal: false,
    });
    expect(analysis.availability).toBe('unavailable');
    expect(analysis.warnings).toContain('no_consensus_data');
  });

  it('unavailable provider partial is excluded from merge', async () => {
    const unavailable = await createUnavailableProvider().fetch('9999');
    const merged = mergeAnalystConsensusIntelligencePartials([unavailable!]);
    expect(merged).toBeNull();
  });

  it('buildAnalystConsensusPartialFromPhase14 derives rating from counts', () => {
    const partial = buildAnalystConsensusPartialFromPhase14({
      availability: 'available',
      rating: null,
      ratingCounts: { strongBuy: 5, buy: 4, hold: 2, sell: 0, strongSell: 0, analystCount: 11 },
      averageTargetPrice: 10.2,
      currentPrice: 9.5,
      targetPriceUpsidePct: 7.4,
      epsForecast: { currentFy: 1, nextFy: 1.1 },
      revenueForecast: { currentFy: null, nextFy: null },
      consensusTrend: 'Upgraded',
      confidenceScore: 70,
      displayJa: {} as never,
      evaluationJa: '',
      hasRatingOrTarget: true,
      fetchedAt: new Date().toISOString(),
      availabilityLabelJa: '',
      source: 'finnhub',
    });
    expect(partial?.consensusRating).toBe('Strong Buy');
    expect(partial?.source).toBe('phase14_consensus');
  });

  it.each(AUDIT_ANALYST_CONSENSUS_STOCKS)('mock fixture %s builds without crash', async (code) => {
    const fixture = getMockFixtureForStock(code);
    expect(fixture).not.toBeNull();
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: code,
      useMockFixture: true,
      fetchLiveExternal: false,
    });
    expect(analysis.availability).toBe('available');
    expect(analysis.hasExtractableData).toBe(true);
    expect(analysis.evaluationJa).toContain('アナリスト');
  });

  it('enrichStockWithAnalystConsensusIntelligence auto-mocks audit stocks offline', async () => {
    for (const code of AUDIT_ANALYST_CONSENSUS_STOCKS) {
      const enriched = await enrichStockWithAnalystConsensusIntelligence({
        stock: minimalStock(code),
        fetchLiveExternal: false,
      });
      expect(enriched.analystConsensusIntelligence?.availability).toBe('available');
      expect(enriched.fetchedFields).toContain('phase24.analyst_consensus_intelligence');
    }
  });

  it('enrichStock returns unavailable for unknown stock without mock', async () => {
    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock: minimalStock('9999'),
      useMockFixture: false,
      fetchLiveExternal: false,
    });
    expect(enriched.analystConsensusIntelligence?.availability).toBe('unavailable');
    expect(enriched.missingFields).toContain('phase24.analyst_consensus_intelligence');
  });

  it('fetchAll with fetchLiveExternal adds provider_error path without live call', async () => {
    const partial = await fetchAllAnalystConsensusIntelligencePartials({
      stockCode: '9999',
      useMockFixture: false,
      fetchLiveExternal: true,
    });
    expect(partial?.providerError).toContain('Live external fetch disabled');
  });

  it('4707 mock fixture has negative upside score', async () => {
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: '4707',
      useMockFixture: true,
    });
    expect(AUDIT_MOCK_FIXTURES['4707'].impliedUpsidePct).toBeLessThan(0);
    expect(analysis.consensusScore).toBeLessThan(0);
  });
});

describe('bursaPhase24 edge cases', () => {
  it('computeAnalystConsensusScore handles analystCount 0 without throwing', () => {
    const score = computeAnalystConsensusScore({
      analystCount: 0,
      buyCount: 0,
      holdCount: 0,
      sellCount: 0,
      impliedUpsidePct: null,
      targetRevisionDirection: null,
      targetRevisionPct: null,
      ratingRevisionDirection: null,
    });
    expect(score).toBeGreaterThanOrEqual(ANALYST_CONSENSUS_SCORE_MIN);
    expect(score).toBeLessThanOrEqual(ANALYST_CONSENSUS_SCORE_MAX);
  });

  it('computeBuyHoldSellBalance returns missing label when all counts are zero', () => {
    const balance = computeBuyHoldSellBalance({
      analystCount: 0,
      buyCount: 0,
      holdCount: 0,
      sellCount: 0,
    });
    expect(balance.labelJa).toContain('データ未取得');
  });

  it('computeBuyHoldSellBalance uses sum when analystCount mismatches buy+hold+sell', () => {
    const balance = computeBuyHoldSellBalance({
      analystCount: 20,
      buyCount: 5,
      holdCount: 3,
      sellCount: 2,
    });
    expect(balance.buyPct).toBeCloseTo(50, 0);
  });

  it('computeImpliedUpside returns null for missing or non-positive prices', () => {
    expect(computeImpliedUpside(null, 10, null)).toBeNull();
    expect(computeImpliedUpside(10, null, null)).toBeNull();
    expect(computeImpliedUpside(10, 0, null)).toBeNull();
    expect(computeImpliedUpside(-5, 10, null)).toBeNull();
    expect(computeImpliedUpside(10, -3, null)).toBeNull();
  });

  it('computeAnalystConsensusScore clamps extreme upside and downside', () => {
    const high = computeAnalystConsensusScore({
      analystCount: 20,
      buyCount: 18,
      holdCount: 1,
      sellCount: 1,
      impliedUpsidePct: 250,
      targetRevisionDirection: 'Upgraded',
      targetRevisionPct: 20,
      ratingRevisionDirection: 'Upgraded',
    });
    const low = computeAnalystConsensusScore({
      analystCount: 20,
      buyCount: 1,
      holdCount: 1,
      sellCount: 18,
      impliedUpsidePct: -250,
      targetRevisionDirection: 'Downgraded',
      targetRevisionPct: -20,
      ratingRevisionDirection: 'Downgraded',
    });
    expect(high).toBeLessThanOrEqual(ANALYST_CONSENSUS_SCORE_MAX);
    expect(low).toBeGreaterThanOrEqual(ANALYST_CONSENSUS_SCORE_MIN);
  });

  it('resolveAnalystConsensusConfidence handles dispersion 0 and 100', () => {
    expect(
      resolveAnalystConsensusConfidence({
        analystCount: 12,
        consensusDispersion: 0,
        fieldCount: 11,
        hasTargetAndPrice: true,
        warnings: [],
      }),
    ).toBe('High');
    expect(
      resolveAnalystConsensusConfidence({
        analystCount: 12,
        consensusDispersion: 100,
        fieldCount: 10,
        hasTargetAndPrice: true,
        warnings: ['high_dispersion'],
      }),
    ).toBe('Medium');
  });

  it('collectAnalystConsensusWarnings deduplicates entries', () => {
    const staleDate = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const warnings = collectAnalystConsensusWarnings({
      partial: {
        ...MOCK_ANALYST_CONSENSUS_FIXTURE,
        targetPrice: null,
        currentPrice: null,
        analystCount: 1,
        consensusDispersion: 90,
        updatedAt: staleDate,
        providerError: 'err',
      },
    });
    const unique = new Set(warnings);
    expect(unique.size).toBe(warnings.length);
    expect(warnings).toContain('missing_target_price');
    expect(warnings).toContain('stale_data');
  });

  it('buildAnalystConsensusPartialFromPhase14 handles partial missing fields', () => {
    const partial = buildAnalystConsensusPartialFromPhase14({
      availability: 'available',
      rating: null,
      ratingCounts: null,
      averageTargetPrice: 9.5,
      currentPrice: null,
      targetPriceUpsidePct: null,
      epsForecast: { currentFy: null, nextFy: null },
      revenueForecast: { currentFy: null, nextFy: null },
      consensusTrend: null,
      confidenceScore: 0,
      displayJa: {} as never,
      evaluationJa: '',
      hasRatingOrTarget: true,
      fetchedAt: null,
      availabilityLabelJa: '',
      source: 'none',
    });
    expect(partial?.targetPrice).toBe(9.5);
    expect(partial?.currentPrice).toBeNull();
    expect(partial?.consensusRating).toBeNull();
  });

  it('provider error with partial mock data still returns available analysis', async () => {
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: '1155',
      useMockFixture: true,
      fetchLiveExternal: true,
    });
    expect(analysis.availability).toBe('available');
    expect(analysis.warnings).toContain('provider_error');
    expect(analysis.consensusScore).toBeGreaterThanOrEqual(ANALYST_CONSENSUS_SCORE_MIN);
  });

  it('provider error with no data returns unavailable', async () => {
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: '9999',
      useMockFixture: false,
      fetchLiveExternal: true,
    });
    expect(analysis.availability).toBe('unavailable');
    expect(analysis.warnings).toContain('no_consensus_data');
  });

  it.each(AUDIT_ANALYST_CONSENSUS_STOCKS)(
    'mock fixture %s score stays within -20..+20',
    async (code) => {
      const analysis = await buildAnalystConsensusIntelligenceAnalysis({
        stockCode: code,
        useMockFixture: true,
      });
      expect(analysis.consensusScore).toBeGreaterThanOrEqual(ANALYST_CONSENSUS_SCORE_MIN);
      expect(analysis.consensusScore).toBeLessThanOrEqual(ANALYST_CONSENSUS_SCORE_MAX);
    },
  );

  it('Japanese evaluationJa is non-empty for available mock analysis', async () => {
    const analysis = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: '1155',
      useMockFixture: true,
    });
    expect(analysis.evaluationJa.trim().length).toBeGreaterThan(10);
    expect(analysis.displayJa.consensusRating).not.toBe('データ未取得');
  });
});
