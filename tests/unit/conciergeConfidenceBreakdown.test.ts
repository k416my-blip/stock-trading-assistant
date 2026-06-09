import { describe, expect, it } from 'vitest';
import { buildConfidencePointBreakdown } from '../../src/services/conciergeConfidenceBreakdown';
import type { ConciergeSymbolActionGuide } from '../../src/types/conciergeActionGuide';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

const sym: ConciergeSymbolEvidence = {
  symbol: '1155',
  companyName: 'Maybank',
  market: 'bursa',
  displayLabelJa: '1155 Maybank',
  currentPrice: 10.2,
  previousClose: 10.1,
  intradayChangePct: 0.5,
  volume: 1_000_000,
  volumeSurgeRatio: 1.1,
  quoteAgeSeconds: 60,
  quoteIsStale: false,
  portfolioHolding: null,
  latestFinancialNews: [],
  newsSummaryJa: '',
  newsSource: '',
  xSentiment: null,
  trendingKeywords: [],
  unusualActivityFlags: [],
  dataGapsJa: ['ニュース見出し未取得', 'Xセンチメント未取得（キャッシュなし・今回未取得）'],
};

const guide: ConciergeSymbolActionGuide = {
  symbol: '1155',
  market: 'bursa',
  displayLabelJa: '1155 Maybank',
  primaryCategory: 'watch',
  categories: ['watch'],
  marketStance: 'neutral',
  marketStanceLabelJa: '中立',
  reasonBulletsJa: [],
  recommendedActionsJa: [],
  attentionPointsJa: [],
  riskSummaryJa: '',
  confidencePct: 36,
  insufficientData: false,
  insufficientDataLabelJa: null,
  evidenceScores: {
    priceAction: 6,
    volume: 10,
    news: 0,
    xSentiment: 0,
    volatility: 5,
  },
  notificationPriority: 'low',
  notificationWhyJa: '',
};

describe('conciergeConfidenceBreakdown', () => {
  it('builds 36% breakdown with market avg and data gap penalty', () => {
    const b = buildConfidencePointBreakdown(sym, guide);
    expect(b.marketDataPts).toBe(7);
    expect(b.newsPts).toBe(0);
    expect(b.xPts).toBe(0);
    expect(b.dataGapPenalty).toBe(16);
    expect(b.confidenceScore).toBe(36);
  });
});
