import { describe, expect, it } from 'vitest';
import {
  aggregateNewsImpactMaterialScore,
  articleMaterialContribution,
  classifyNewsImpactEvent,
  computeEventImpactScore,
  EVENT_IMPACT_RANGES,
  measureEventClassificationAccuracy,
  newsImpactRecencyWeight,
} from '../../src/services/bursa/bursaNewsImpactEngine';
import {
  buildNewsArticles,
  newsIntelligenceArticleMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaNewsIntelligenceService';

describe('bursaNewsImpactEngine Phase18.5', () => {
  it('classifies 16 event types with priority', () => {
    expect(classifyNewsImpactEvent('Company to raise guidance for FY2026')).toBe('Guidance Raise');
    expect(classifyNewsImpactEvent('Management cuts profit guidance amid weak demand')).toBe(
      'Guidance Cut',
    );
    expect(classifyNewsImpactEvent('Wins contract award worth RM500m')).toBe('Contract Award');
    expect(classifyNewsImpactEvent('Receives large order from national utility')).toBe('Large Order');
    expect(classifyNewsImpactEvent('Board approves special dividend increase')).toBe(
      'Dividend Increase',
    );
    expect(classifyNewsImpactEvent('Company slashes dividend payout')).toBe('Dividend Cut');
    expect(classifyNewsImpactEvent('Regulatory approval granted for new plant')).toBe(
      'Regulatory Approval',
    );
    expect(classifyNewsImpactEvent('Faces regulatory probe and compliance breach')).toBe(
      'Regulatory Risk',
    );
    expect(classifyNewsImpactEvent('Q4 earnings report beat expectations')).toBe('Earnings');
    expect(classifyNewsImpactEvent('Random headline')).toBe('Other');
  });

  it('scores impact within event-specific ranges', () => {
    const raise = computeEventImpactScore('Guidance Raise', 'Company raises guidance strongly');
    expect(raise).toBeGreaterThanOrEqual(EVENT_IMPACT_RANGES['Guidance Raise'].min);
    expect(raise).toBeLessThanOrEqual(EVENT_IMPACT_RANGES['Guidance Raise'].max);

    const contract = computeEventImpactScore('Contract Award', 'Major contract award');
    expect(contract).toBeGreaterThanOrEqual(60);
    expect(contract).toBeLessThanOrEqual(90);

    const other = computeEventImpactScore('Other', 'Minor update');
    expect(other).toBeLessThanOrEqual(30);
  });

  it('applies Phase18.5 recency decay weights', () => {
    const now = Date.parse('2026-06-10T12:00:00.000Z');
    expect(newsImpactRecencyWeight('2026-06-10T08:00:00.000Z', now)).toBe(1);
    expect(newsImpactRecencyWeight('2026-06-08T12:00:00.000Z', now)).toBe(0.7);
    expect(newsImpactRecencyWeight('2026-06-03T12:00:00.000Z', now)).toBe(0.4);
    expect(newsImpactRecencyWeight('2026-05-15T12:00:00.000Z', now)).toBe(0.1);
  });

  it('material contribution follows Impact × Sentiment', () => {
    expect(
      articleMaterialContribution({ sentiment: 'Bullish', impactScore: 90, recencyWeight: 1 }),
    ).toBe(18);
    expect(
      articleMaterialContribution({ sentiment: 'Bearish', impactScore: 90, recencyWeight: 1 }),
    ).toBe(-18);
    expect(
      articleMaterialContribution({ sentiment: 'Neutral', impactScore: 90, recencyWeight: 1 }),
    ).toBe(0);
  });

  it('aggregate material score is clamped -20 to +20', () => {
    const articles = buildNewsArticles([
      {
        headline: 'Record earnings surge beats raised guidance',
        publishedAt: new Date().toISOString(),
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ]);
    const adj = aggregateNewsImpactMaterialScore(articles);
    expect(adj).toBeGreaterThan(0);
    expect(adj).toBeLessThanOrEqual(20);

    const analysis = {
      availability: 'available' as const,
      articles,
      availabilityLabelJa: '',
      bullishCount: 1,
      bearishCount: 0,
      neutralCount: 0,
      last24hCount: 1,
      aggregateImpactScore: 90,
      netSentimentScore: 90,
      eventTypeDistribution: {},
      impactDistribution: { low: 0, mid: 0, high: 1, avg: 90, max: 90 },
      eventClassificationAccuracy: 1,
      confidenceDistribution: { low: 0, mid: 0, high: 1, avg: 90 },
      misclassificationSamples: [],
      otherCountBeforeExpansion: 0,
      otherCountAfterExpansion: 0,
      otherReductionRate: 0,
      eventClusters: [],
      topEventClusters: [],
      materialScoreAdjustment187: adj,
      materialScoreAdjustment188: 0,
      sourceCoverageRate: 0.8,
      fieldAcquisitionRate: 0.9,
      materialWeightMax: 20,
      sourcesUsed: ['news_api' as const],
      unavailableReason: null,
      displayJa: {} as never,
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    };
    expect(newsIntelligenceArticleMaterialScoreAdjustment(analysis)).toBe(adj);
  });

  it('event classification accuracy is measurable', () => {
    const articles = buildNewsArticles([
      {
        headline: 'Q4 earnings beat',
        publishedAt: new Date().toISOString(),
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ]);
    expect(measureEventClassificationAccuracy(articles)).toBe(1);
  });
});
