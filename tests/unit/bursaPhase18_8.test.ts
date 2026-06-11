import { describe, expect, it } from 'vitest';
import {
  aggregateClusterMaterialScore,
  buildEventClusters,
  computeClusterEventScore,
  computeFrequencyWeight,
  computeSourceWeight,
} from '../../src/services/bursa/bursaNewsEventClusterEngine';
import {
  newsIntelligenceArticleMaterialScoreAdjustment,
  newsIntelligenceMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaNewsIntelligenceService';
import type { NewsIntelligenceArticle } from '../../src/types/bursaNewsIntelligence';

function article(partial: Partial<NewsIntelligenceArticle> & Pick<NewsIntelligenceArticle, 'headline' | 'eventType'>): NewsIntelligenceArticle {
  return {
    publishedAt: new Date().toISOString(),
    source: 'news_api',
    sourceLabel: 'NewsAPI',
    sentiment: 'Bullish',
    impactScore: 90,
    preExpansionEventType: 'Other',
    stage1EventType: 'Other',
    eventConfidence: 85,
    eventValidated: true,
    rejectionReason: null,
    url: null,
    recencyWeight: 1,
    dedupeKey: partial.headline,
    ...partial,
  };
}

describe('bursaNewsEventClusterEngine Phase18.8', () => {
  it('computes weight factors', () => {
    expect(computeFrequencyWeight(1)).toBe(0.5);
    expect(computeFrequencyWeight(3)).toBe(0.9);
    expect(computeFrequencyWeight(5)).toBe(1);
    expect(computeSourceWeight(1)).toBe(0.6);
    expect(computeSourceWeight(3)).toBe(1);
  });

  it('computes EventScore = Impact × Frequency × Source × Time', () => {
    const score = computeClusterEventScore({
      averageImpact: 90,
      frequencyWeight: 1,
      sourceWeight: 1,
      timeWeight: 1,
    });
    expect(score).toBe(90);
  });

  it('aggregates articles into event clusters', () => {
    const clusters = buildEventClusters([
      article({ headline: 'a1', eventType: 'Guidance Raise', source: 'news_api' }),
      article({ headline: 'a2', eventType: 'Guidance Raise', source: 'yahoo_finance_news' }),
      article({ headline: 'a3', eventType: 'Guidance Raise', source: 'rss_news' }),
      article({ headline: 'b1', eventType: 'Regulatory', sentiment: 'Neutral' }),
    ]);
    const raise = clusters.find((c) => c.eventType === 'Guidance Raise');
    expect(raise?.clusterLabel).toBe('Guidance Raise Cluster');
    expect(raise?.articleCount).toBe(3);
    expect(raise?.sourceDiversity).toBe(3);
    expect(raise?.eventScore).toBeGreaterThan(0);
  });

  it('cluster material score differs from single-article when frequency boosts', () => {
    const clusters = buildEventClusters([
      article({ headline: 'g1', eventType: 'Guidance Raise' }),
      article({ headline: 'g2', eventType: 'Guidance Raise' }),
      article({ headline: 'g3', eventType: 'Guidance Raise' }),
    ]);
    const clusterAdj = aggregateClusterMaterialScore(clusters);
    expect(clusterAdj).toBeGreaterThan(0);
    expect(clusterAdj).toBeLessThanOrEqual(20);
  });

  it('material score adjustment uses 18.8 cluster by default', () => {
    const analysis = {
      availability: 'available' as const,
      articles: [],
      eventClusters: buildEventClusters([
        article({ headline: 'g1', eventType: 'Guidance Raise' }),
        article({ headline: 'g2', eventType: 'Guidance Raise' }),
      ]),
      materialScoreAdjustment187: 5,
      materialScoreAdjustment188: 12,
      availabilityLabelJa: '',
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      last24hCount: 0,
      aggregateImpactScore: 0,
      netSentimentScore: 0,
      eventTypeDistribution: {},
      impactDistribution: { low: 0, mid: 0, high: 0, avg: 0, max: 0 },
      eventClassificationAccuracy: 1,
      confidenceDistribution: { low: 0, mid: 0, high: 0, avg: 0 },
      misclassificationSamples: [],
      otherCountBeforeExpansion: 0,
      otherCountAfterExpansion: 0,
      otherReductionRate: 0,
      topEventClusters: [],
      sourceCoverageRate: 0.8,
      fieldAcquisitionRate: 0.9,
      materialWeightMax: 20,
      sourcesUsed: [],
      unavailableReason: null,
      displayJa: {} as never,
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    };
    expect(newsIntelligenceMaterialScoreAdjustment(analysis)).toBe(12);
    expect(newsIntelligenceArticleMaterialScoreAdjustment(analysis)).toBe(5);
  });
});
