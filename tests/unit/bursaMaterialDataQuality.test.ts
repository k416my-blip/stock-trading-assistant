import { describe, expect, it } from 'vitest';
import {
  buildSourceScoreBreakdown,
  computeMaterialDataQuality,
  formatPaidApiConnection,
} from '../../src/services/bursa/bursaMaterialDataQuality';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

function mockStock(
  overrides: Partial<BursaStockMaterialAnalysis> = {},
): BursaStockMaterialAnalysis {
  return {
    stockCode: '1155',
    companyName: 'Maybank',
    materialScore: 54,
    scoreBreakdown: [],
    positiveMaterials: [
      {
        id: '1',
        source: 'bursa_announcement',
        sentiment: '好材料',
        title: '増配',
        score: 25,
        reasonJa: '',
        publishedAt: null,
        url: null,
      },
      {
        id: '2',
        source: 'rss',
        sentiment: '好材料',
        title: 'Rally headline',
        score: 29,
        reasonJa: '',
        publishedAt: null,
        url: null,
      },
    ],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['a', 'b', 'c'],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      bursa_announcement: 'ok',
      rss: 'ok',
      news_api: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
    ...overrides,
  };
}

describe('bursaMaterialDataQuality', () => {
  it('formatPaidApiConnection returns 接続済み or 未接続', () => {
    expect(formatPaidApiConnection('ok')).toBe('接続済み');
    expect(formatPaidApiConnection('partial')).toBe('接続済み');
    expect(formatPaidApiConnection('skipped')).toBe('未接続');
  });

  it('buildSourceScoreBreakdown aggregates by source', () => {
    const rows = buildSourceScoreBreakdown(mockStock());
    const bursa = rows.find((r) => r.sourceJa === 'Bursa');
    const rss = rows.find((r) => r.sourceJa === 'RSS');
    const news = rows.find((r) => r.sourceJa === 'News');
    expect(bursa?.scoreJa).toBe('+25');
    expect(rss?.scoreJa).toBe('+29');
    expect(news?.scoreJa).toBe('+0');
  });

  it('computeMaterialDataQuality tier labels', () => {
    const allOk = computeMaterialDataQuality({
      bursa_announcement: 'ok',
      rss: 'ok',
      news_api: 'ok',
      x: 'ok',
      reddit: 'ok',
    });
    expect(allOk.stars).toBe('★★★★★');
    expect(allOk.labelJa).toBe('Bursa+RSS+News+X+Reddit');

    const bursaRss = computeMaterialDataQuality({
      bursa_announcement: 'ok',
      rss: 'ok',
      news_api: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    });
    expect(bursaRss.stars).toBe('★★★☆☆');
    expect(bursaRss.labelJa).toBe('Bursa+RSS');

    const rssOnly = computeMaterialDataQuality({
      bursa_announcement: 'unavailable',
      rss: 'ok',
      news_api: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    });
    expect(rssOnly.stars).toBe('★★☆☆☆');
    expect(rssOnly.labelJa).toBe('RSSのみ');

    const none = computeMaterialDataQuality({
      bursa_announcement: 'unavailable',
      rss: 'failed',
      news_api: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    });
    expect(none.stars).toBe('★☆☆☆☆');
    expect(none.labelJa).toBe('データ不足');
  });
});
