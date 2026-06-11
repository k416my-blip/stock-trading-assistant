import { describe, expect, it } from 'vitest';
import {
  buildAnalystConsensusAnalysis,
  resolveAnalystConsensusApiKeys,
} from '../../src/services/bursa/bursaAnalystConsensusService';
import {
  deriveConsensusTrend,
  deriveRatingFromCounts,
  mergeAnalystConsensusPartials,
} from '../../src/services/bursa/bursaAnalystConsensusProviders';
import {
  ANALYST_CONSENSUS_UNAVAILABLE_JA,
  ANALYST_FIELD_MISSING_JA,
} from '../../src/types/bursaAnalystConsensus';
import type { AnalysisApiKeys } from '../../src/services/analysisApiKeys';

const EMPTY_KEYS: AnalysisApiKeys = {
  newsApiKey: '',
  snsApiKey: '',
  earningsApiKey: '',
  redditApiKey: '',
  xApiKey: '',
  alphaVantageApiKey: '',
  fmpApiKey: '',
};

describe('bursaPhase14 analyst consensus', () => {
  it('derives rating from analyst counts', () => {
    const rating = deriveRatingFromCounts({
      strongBuy: 5,
      buy: 3,
      hold: 2,
      sell: 0,
      strongSell: 0,
      analystCount: 10,
    });
    expect(rating).toBe('Buy');
  });

  it('detects upgraded consensus trend', () => {
    const trend = deriveConsensusTrend(
      { strongBuy: 4, buy: 3, hold: 2, sell: 1, strongSell: 0, analystCount: 10 },
      { strongBuy: 1, buy: 2, hold: 5, sell: 2, strongSell: 0, analystCount: 10 },
    );
    expect(trend).toBe('Upgraded');
  });

  it('merges partial snapshots without inventing values', () => {
    const merged = mergeAnalystConsensusPartials([
      {
        source: 'finnhub',
        rating: 'Buy',
        ratingCounts: {
          strongBuy: 2,
          buy: 4,
          hold: 3,
          sell: 1,
          strongSell: 0,
          analystCount: 10,
        },
        averageTargetPrice: null,
        epsForecast: { currentFy: 0.52, nextFy: null },
        revenueForecast: { currentFy: null, nextFy: null },
        consensusTrend: null,
      },
      {
        source: 'yahoo_finance',
        rating: null,
        ratingCounts: null,
        averageTargetPrice: 10.25,
        epsForecast: { currentFy: null, nextFy: 0.58 },
        revenueForecast: { currentFy: 1_000_000, nextFy: null },
        consensusTrend: 'Maintained',
      },
    ]);
    expect(merged?.rating).toBe('Buy');
    expect(merged?.averageTargetPrice).toBe(10.25);
    expect(merged?.epsForecast.currentFy).toBe(0.52);
    expect(merged?.epsForecast.nextFy).toBe(0.58);
    expect(merged?.consensusTrend).toBe('Maintained');
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildAnalystConsensusAnalysis({
      stockCode: '1155',
      apiKeys: EMPTY_KEYS,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(ANALYST_CONSENSUS_UNAVAILABLE_JA);
    expect(result.displayJa.rating).toBe(ANALYST_FIELD_MISSING_JA);
  });

  it('resolveAnalystConsensusApiKeys reads earningsApiKey as finnhub', () => {
    const keys = resolveAnalystConsensusApiKeys({
      ...EMPTY_KEYS,
      earningsApiKey: 'test-finnhub-key-12345678',
    });
    expect(keys.finnhubApiKey).toBe('test-finnhub-key-12345678');
  });
});
