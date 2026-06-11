import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildNewsArticles,
  classifyNewsEventType,
  classifyNewsSentiment,
  computeArticleImpactScore,
  deduplicateNewsRows,
  isPhase11NewsMaterialSource,
  newsIntelligenceArticleMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaNewsIntelligenceService';
import { aggregateNewsImpactMaterialScore } from '../../src/services/bursa/bursaNewsImpactEngine';
import { enrichStockWithNewsIntelligence } from '../../src/services/bursa/bursaPhase18Analysis';
import { NEWS_INTELLIGENCE_UNAVAILABLE_JA } from '../../src/types/bursaNewsIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');

function baseStock(): BursaStockMaterialAnalysis {
  return {
    stockCode: '1155',
    companyName: 'MALAYAN BANKING BERHAD',
    materialScore: 10,
    scoreBreakdown: [],
    positiveMaterials: [
      {
        id: 'n1',
        source: 'news_api',
        title: 'Maybank profit rises on strong earnings',
        url: null,
        publishedAt: new Date().toISOString(),
        score: 12,
        sentiment: '好材料',
        reasonJa: 'test',
        sourceLabelJa: 'News API',
      },
    ],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['a', 'b', 'c'],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'ok',
      rss: 'ok',
      bursa_announcement: 'ok',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

describe('bursaNewsIntelligence Phase18', () => {
  it('classifies sentiment from headline keywords', () => {
    expect(classifyNewsSentiment('Maybank profit surge beats estimates')).toBe('Bullish');
    expect(classifyNewsSentiment('Company faces lawsuit over fraud')).toBe('Bearish');
    expect(classifyNewsSentiment('Board meeting scheduled next week')).toBe('Neutral');
  });

  it('classifies event types via Phase18.5 engine', () => {
    expect(classifyNewsEventType('Q4 earnings beat expectations')).toBe('Earnings');
    expect(classifyNewsEventType('Special dividend declared')).toBe('Dividend Increase');
    expect(classifyNewsEventType('Random headline')).toBe('Other');
  });

  it('deduplicates news by normalized title', () => {
    const merged = deduplicateNewsRows([
      {
        headline: 'Maybank Profit Rises!',
        publishedAt: '2026-06-01T10:00:00.000Z',
        source: 'rss_news',
        sourceLabel: 'RSS',
        url: null,
      },
      {
        headline: 'maybank profit rises',
        publishedAt: '2026-06-02T10:00:00.000Z',
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe('news_api');
  });

  it('event impact score is independent of recency (decay applied separately)', () => {
    const earnings = computeArticleImpactScore({
      headline: 'Q2 earnings report: Maybank beats estimates',
    });
    const other = computeArticleImpactScore({ headline: 'Minor board update' });
    expect(earnings).toBeGreaterThan(other);
    expect(earnings).toBeGreaterThanOrEqual(70);
  });

  it('material score adjustment is bounded -20 to +20', () => {
    const bullishArticles = buildNewsArticles([
      {
        headline: 'Record earnings surge beats guidance',
        publishedAt: new Date().toISOString(),
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
      {
        headline: 'Strong profit growth upgrade',
        publishedAt: new Date().toISOString(),
        source: 'yahoo_finance_news',
        sourceLabel: 'Yahoo',
        url: null,
      },
    ]);
    const bullishAdj187 = aggregateNewsImpactMaterialScore(bullishArticles);
    const bullish = newsIntelligenceArticleMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: '取得済',
      articles: bullishArticles,
      materialScoreAdjustment187: bullishAdj187,
    } as never);
    expect(bullish).toBeGreaterThan(0);
    expect(bullish).toBeLessThanOrEqual(20);

    const bearishArticles = buildNewsArticles([
      {
        headline: 'Profit plunge after lawsuit downgrade',
        publishedAt: new Date().toISOString(),
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ]);
    const bearishAdj187 = aggregateNewsImpactMaterialScore(bearishArticles);
    const bearish = newsIntelligenceArticleMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: '取得済',
      articles: bearishArticles,
      materialScoreAdjustment187: bearishAdj187,
    } as never);
    expect(bearish).toBeLessThan(0);
    expect(bearish).toBeGreaterThanOrEqual(-20);
  });

  it('does not strip phase17 dividend intelligence materials', () => {
    const keep = {
      source: 'bursa_announcement',
      sourceLabelJa: 'Dividend Intelligence (Phase17.5)',
      id: 'bursa_announcement-dividend-intelligence',
    };
    expect(isPhase11NewsMaterialSource(keep.source, keep.sourceLabelJa, keep.id)).toBe(false);

    const drop = {
      source: 'news_api',
      sourceLabelJa: 'News API',
      id: 'news_api-news-0',
    };
    expect(isPhase11NewsMaterialSource(drop.source, drop.sourceLabelJa, drop.id)).toBe(true);
  });

  it('enrich removes phase11 news duplicates and adds phase18 aggregate', async () => {
    const enriched = await enrichStockWithNewsIntelligence({
      stock: baseStock(),
      stockHtml: stockFixture,
      fetchLiveExternal: true,
    });
    expect(enriched.newsIntelligence).toBeTruthy();
    const phase11News = [
      ...(enriched.positiveMaterials ?? []),
      ...(enriched.negativeMaterials ?? []),
      ...(enriched.neutralMaterials ?? []),
    ].filter((m) => m.source === 'news_api');
    expect(phase11News).toHaveLength(0);
    if (enriched.newsIntelligence?.hasExtractableData) {
      expect(enriched.newsIntelligence.evaluationJa).toContain('News Intelligence');
    } else {
      expect(enriched.newsIntelligence?.evaluationJa).toBe(NEWS_INTELLIGENCE_UNAVAILABLE_JA);
    }
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const enriched = await enrichStockWithNewsIntelligence({
      stock: baseStock(),
      stockHtml: stockFixture,
      fetchLiveExternal: false,
    });
    expect(enriched.newsIntelligence?.evaluationJa).toBe(NEWS_INTELLIGENCE_UNAVAILABLE_JA);
  });
});
