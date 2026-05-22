import { describe, expect, it } from 'vitest';
import {
  detectUnusualActivityForSymbol,
  evaluateConciergeDataProactiveAlerts,
} from '../../src/services/conciergeAnomalyDetector';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

describe('conciergeAnomalyDetector', () => {
  it('detects 5% sharp drop', () => {
    const flags = detectUnusualActivityForSymbol({
      intradayChangePct: -6.2,
      volumeSurgeRatio: 1.1,
      xSentiment: null,
    });
    expect(flags.some((f) => f.id === 'sharp_drop_5pct')).toBe(true);
  });

  it('detects volume surge 3x', () => {
    const flags = detectUnusualActivityForSymbol({
      intradayChangePct: -1,
      volumeSurgeRatio: 3.5,
      xSentiment: null,
    });
    expect(flags.some((f) => f.id === 'volume_surge_3x')).toBe(true);
  });

  it('builds proactive alert with display label', () => {
    const sym: ConciergeSymbolEvidence = {
      symbol: '7103',
      companyName: 'Spritzer',
      market: 'bursa',
      displayLabelJa: '7103・マレーシア（Spritzer）',
      currentPrice: 1.2,
      previousClose: 1.3,
      intradayChangePct: -6,
      volume: 100000,
      volumeSurgeRatio: 3.5,
      quoteAgeSeconds: 60,
      quoteIsStale: false,
      portfolioHolding: null,
      latestFinancialNews: [],
      newsSummaryJa: '',
      newsSource: 'cache',
      xSentiment: {
        postCount: 12,
        bullishPct: 10,
        bearishPct: 55,
        panicPct: 20,
        hypePct: 5,
        trendWords: ['loss'],
        postSurgeRatePct: 50,
        summaryJa: 'neg',
        analysisBasis: 'fetched_posts',
        fromCache: true,
      },
      trendingKeywords: [],
      unusualActivityFlags: [],
      dataGapsJa: [],
    };
    sym.unusualActivityFlags = detectUnusualActivityForSymbol({
      intradayChangePct: sym.intradayChangePct,
      volumeSurgeRatio: sym.volumeSurgeRatio,
      xSentiment: sym.xSentiment,
    });
    const alerts = evaluateConciergeDataProactiveAlerts([sym]);
    expect(alerts.some((a) => a.titleJa.includes('ネガティブ投稿'))).toBe(true);
    expect(alerts.some((a) => a.titleJa.includes('7103'))).toBe(true);
    expect(alerts.some((a) => a.notificationWhyJa?.includes('なぜ通知したか'))).toBe(true);
    expect(alerts.some((a) => a.priority === 'critical')).toBe(true);
  });
});
