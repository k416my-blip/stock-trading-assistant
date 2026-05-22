import { describe, expect, it } from 'vitest';
import { evaluateAutonomousAlertForSymbol } from '../../src/services/autonomousAlertTrigger';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function stubSymbol(overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol: '1155',
    companyName: 'Test',
    market: 'bursa',
    displayLabelJa: '1155.KL',
    currentPrice: 10,
    previousClose: 10.5,
    intradayChangePct: -1,
    volume: 1000,
    volumeSurgeRatio: 1,
    quoteAgeSeconds: 60,
    quoteIsStale: false,
    portfolioHolding: null,
    latestFinancialNews: [],
    newsSummaryJa: '',
    newsSource: 'cache',
    xSentiment: null,
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('autonomousAlertTrigger', () => {
  it('does not notify on single weak signal', () => {
    const e = evaluateAutonomousAlertForSymbol(stubSymbol(), null, 'balanced', false);
    expect(e.signalCount).toBeLessThan(2);
    expect(e.shouldNotify).toBe(false);
  });

  it('notifies when multiple signals align', () => {
    const e = evaluateAutonomousAlertForSymbol(
      stubSymbol({
        intradayChangePct: -5,
        volumeSurgeRatio: 3.5,
        xSentiment: {
          postCount: 20,
          bullishPct: 20,
          bearishPct: 72,
          panicPct: 35,
          hypePct: 5,
          trendWords: ['sell'],
          postSurgeRatePct: 50,
          summaryJa: 'neg',
          analysisBasis: 'test',
          fromCache: true,
        },
        latestFinancialNews: [
          {
            title: 'Profit warning',
            sentiment: 'negative',
            sourceTier: 'major_news',
          },
        ],
      }),
      null,
      'balanced',
      false,
    );
    expect(e.signalCount).toBeGreaterThanOrEqual(2);
    expect(e.shouldNotify).toBe(true);
    expect(e.notificationWhyJa).toContain('複合シグナル');
  });

  it('respects excluded symbols', () => {
    const e = evaluateAutonomousAlertForSymbol(
      stubSymbol({ intradayChangePct: -6, volumeSurgeRatio: 4 }),
      null,
      'aggressive',
      true,
    );
    expect(e.shouldNotify).toBe(false);
  });
});
