import { describe, expect, it } from 'vitest';
import {
  buildConciergeEnhancedAnalysis,
  materialScoreToOverallScore,
  resolveOverallJudgment,
  resolveRecommendedAction,
} from '../../src/services/buildConciergeEnhancedAnalysis';
import type { ConciergeEvidenceBundle } from '../../src/types/conciergeEvidence';
import type { MaterialStockRow } from '../../src/services/bursa/bursaMaterialAnalysisService';

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
        latestFinancialNews: [{ title: 'Maybank profit rises', sentiment: 'ポジティブ' }],
        newsSummaryJa: 'RSS',
        newsSource: 'Yahoo Finance RSS',
        xSentiment: {
          postCount: 12,
          bullishPct: 40,
          bearishPct: 35,
          panicPct: 5,
          hypePct: 10,
          trendWords: ['dividend'],
          postSurgeRatePct: null,
          summaryJa: '配当関連の投稿',
          analysisBasis: 'x',
          fromCache: false,
        },
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
          marketStance: 'bullish',
          marketStanceLabelJa: '強気',
          reasonBulletsJa: ['日中変化 +2.9%', '配当関連ニュース'],
          recommendedActionsJa: ['保有継続'],
          attentionPointsJa: ['次の決算'],
          riskSummaryJa: '過熱に注意',
          confidencePct: 72,
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
      overallConfidencePct: 72,
      overallStance: 'bullish',
      overallStanceLabelJa: '強気',
      primaryCategory: 'watch',
      aggregatedRecommendationsJa: [],
      aggregatedRisksJa: [],
      aggregatedAttentionJa: [],
    },
    riskControl: {
      generatedAt: new Date().toISOString(),
      overallConfidencePct: 72,
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

function minimalMaterialRow(): MaterialStockRow {
  return {
    stockCode: '1155',
    companyNameJa: 'MALAYAN BANKING BERHAD',
    scoreJa: '+30',
    scoreSign: 'positive',
    summaryLines: ['好材料が増加', 'セクター相対で強い', '材料スコア +30'],
    breakdown: [],
    sourceScoreBreakdown: [
      { sourceJa: 'Bursa', scoreJa: '+15', score: 15 },
      { sourceJa: 'News', scoreJa: '+10', score: 10 },
      { sourceJa: 'X', scoreJa: '+5', score: 5 },
      { sourceJa: 'Reddit', scoreJa: '+0', score: 0 },
    ],
    dataQuality: { stars: '★★★', labelJa: 'test', connectedLabels: [] },
    positive: [{ title: 'Quarterly profit beat', scoreJa: '+15', sourceJa: 'News API' }],
    negative: [],
    neutral: [],
    buyReasons: ['配当利回り'],
    sellReasons: [],
    apiConnections: [],
    itemCountBySource: {},
    redditFetchDiagnostics: {
      fetchMethod: 'rss',
      fetchUrl: 'https://reddit.com',
      articleCount: 2,
      fetchedCount: 20,
      validCount: 2,
      excludedCount: 18,
      irrelevantRate: 0.9,
      confidenceJa: '低',
      investmentConfidenceJa: '中',
      qualityWarningJa: 'Reddit品質低',
      titles: ['Maybank dividend outlook'],
      searchQueries: ['Maybank dividend'],
      fetchedAt: new Date().toISOString(),
      errorReason: null,
      oauthConfigured: false,
    },
    sources: [],
    earningsCallEvaluationJa: 'Earnings Call — やや強気 · 上方・改善トーン',
    earningsCallDisplayJa: {
      managementTone: '経営陣トーン: やや強気（CEO やや強気 / CFO 中立 · 強気語2 / 弱気語0）',
      guidance: 'ガイダンス: 上方・改善トーン',
      qaWatchpoints: 'データ未取得',
    },
  } as unknown as MaterialStockRow;
}

describe('buildConciergeEnhancedAnalysis', () => {
  it('maps material score to overall score 0-100', () => {
    expect(materialScoreToOverallScore(30)).toBe(65);
    expect(materialScoreToOverallScore(-40)).toBe(30);
  });

  it('resolves overall judgment labels', () => {
    expect(resolveOverallJudgment(40, 'neutral')).toBe('強い買い');
    expect(resolveOverallJudgment(-20, 'bearish')).toBe('売り');
  });

  it('resolves recommended action', () => {
    expect(
      resolveRecommendedAction({
        judgment: '買い',
        insufficientData: false,
        categories: ['opportunity'],
        unrealizedPnlPct: 5,
      }),
    ).toBe('追加購入');
  });

  it('builds all 20 mandatory sections', () => {
    const report = buildConciergeEnhancedAnalysis({
      evidence: minimalEvidence(),
      materialRow: minimalMaterialRow(),
    });
    expect(report).not.toBeNull();
    expect(report!.stockNameJa).toContain('1155');
    expect(report!.currentPriceJa).toContain('10.5');
    expect(report!.sharesJa).toContain('100');
    expect(report!.marketValueJa).toContain('1,050');
    expect(report!.unrealizedPnlJa).toContain('MYR');
    expect(report!.overallJudgmentJa).toBe('買い');
    expect(report!.confidencePct).toBe(72);
    expect(report!.judgmentReasonsJa.length).toBeGreaterThan(0);
    expect(report!.sourceEvaluationsJa.news).toContain('News');
    expect(report!.sourceEvaluationsJa.earningsCall).toContain('Earnings Call');
    expect(report!.sourceEvaluationsJa.analystConsensus).toBe('データ未取得');
    expect(report!.earningsCallDetailJa?.managementTone).toContain('経営陣トーン');
    expect(report!.positiveMaterialsJa.length).toBeGreaterThan(0);
    expect(report!.recommendedActionJa).toBeTruthy();
    expect(report!.sourceScoresJa.bursa).toBe(15);
    expect(report!.overallScore).toBeGreaterThan(0);
    expect(report!.overallScore).toBeLessThanOrEqual(100);
  });
});
