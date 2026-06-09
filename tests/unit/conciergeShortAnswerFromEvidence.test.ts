import { describe, expect, it } from 'vitest';
import { buildConciergeShortAnswer } from '../../src/services/conciergeShortAnswerFromEvidence';
import type { ConciergeEvidenceBundle } from '../../src/types/conciergeEvidence';

function minimalEvidence(): ConciergeEvidenceBundle {
  return {
    generatedAt: new Date().toISOString(),
    analysisMode: 'balanced',
    symbols: [
      {
        symbol: '1155.KL',
        companyName: 'Malayan Banking Berhad',
        market: 'bursa',
        displayLabelJa: 'マレー銀行 (1155.KL)',
        currentPrice: 10.5,
        previousClose: 10.2,
        intradayChangePct: 2.9,
        volume: 1e6,
        volumeSurgeRatio: 1.1,
        quoteAgeSeconds: 60,
        quoteIsStale: false,
        portfolioHolding: {
          shares: 100,
          averageBuyPrice: 9.8,
          unrealizedPnlPct: 7.1,
        },
        latestFinancialNews: [{ title: 'Maybank profit rises', sentiment: '中立' }],
        newsSummaryJa: 'RSS',
        newsSource: 'Yahoo Finance RSS',
        xSentiment: null,
        trendingKeywords: [],
        unusualActivityFlags: [],
        dataGapsJa: [],
      },
    ],
    globalSummaryJa: '',
    cacheNotesJa: [],
    actionGuide: {
      generatedAt: new Date().toISOString(),
      symbols: [
        {
          symbol: '1155.KL',
          market: 'bursa',
          displayLabelJa: 'マレー銀行 (1155.KL)',
          primaryCategory: 'watch',
          categories: ['watch'],
          marketStance: 'neutral',
          marketStanceLabelJa: '中立',
          reasonBulletsJa: ['金利サイクルと信用コストを確認'],
          recommendedActionsJa: ['急いで増し玉しない'],
          attentionPointsJa: ['次の決算と配当案内'],
          riskSummaryJa: 'ボラティリティは中程度',
          confidencePct: 50,
          insufficientData: false,
          insufficientDataLabelJa: null,
          evidenceScores: {
            priceAction: 55,
            volume: 50,
            news: 60,
            xSentiment: 40,
            volatility: 50,
          },
          notificationPriority: 'medium',
          notificationWhyJa: '',
        },
      ],
      overallConfidencePct: 50,
      overallStance: 'neutral',
      overallStanceLabelJa: '中立',
      primaryCategory: 'watch',
      aggregatedRecommendationsJa: [],
      aggregatedRisksJa: [],
      aggregatedAttentionJa: [],
    },
    riskControl: {
      generatedAt: new Date().toISOString(),
      overallConfidencePct: 50,
      overallDataQualityScore: 70,
      confidenceGateOpen: true,
      allowSpeculativeAi: true,
      allowActionRecommendations: true,
      analysisBlockedJa: null,
      globalStaleWarningJa: null,
      burstSuppressActive: false,
      deterministicModeHintJa: '',
      apiIsolation: {
        xApiDegraded: false,
        newsApiDegraded: false,
        quoteApiDegraded: false,
        isolationNoteJa: null,
      },
      symbols: [],
    },
  };
}

describe('buildConciergeShortAnswer', () => {
  it('includes holdings and confidence facts from evidence', () => {
    const answer = buildConciergeShortAnswer(undefined, '小口の買い推奨候補はありますが', minimalEvidence());
    expect(answer.factsJa?.some((f) => f.labelJa === '銘柄')).toBe(true);
    expect(answer.factsJa?.some((f) => f.labelJa === '確信度' && f.valueJa.includes('50'))).toBe(true);
    expect(answer.factsJa?.some((f) => f.labelJa === '保有株数' && f.valueJa.includes('100'))).toBe(true);
    expect(answer.riskJa).toContain('ボラ');
    expect(answer.watchJa).toContain('決算');
    expect(answer.reasonsJa.length).toBeGreaterThan(0);
  });
});
