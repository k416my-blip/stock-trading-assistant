/**
 * Top10 変更前後比較（70/30 素のスコア vs 新パイプライン 50/50+矛盾）
 */
import { describe, expect, it } from 'vitest';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import {
  buildPerSymbolRankingMap,
  rankingMapToRuleScores,
} from '../../src/services/hybridRankingConflict';
import { actionConfidenceToDirectionScore } from '../../src/services/hybridStrategyScoreFusion';
import { buildMaybank1155OperationalEvidence } from '../../src/services/strategyRuleScoreAudit';
import type { AiSecondEvaluatorSymbolInput } from '../../src/types/aiSecondEvaluator';
import type { StrategyExecutionBundle, StrategySymbolRecommendation } from '../../src/types/strategyExecution';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

const TOP10 = [
  { symbol: '1155', ruleLegacy: 28, ai: 'buy' as const, conf: 75, rsi: 23 },
  { symbol: '0820EA', ruleLegacy: 50, ai: 'hold' as const, conf: 60, rsi: 32 },
  { symbol: '4707', ruleLegacy: 50, ai: 'hold' as const, conf: 55, rsi: 26 },
  { symbol: '1023', ruleLegacy: 45, ai: 'hold' as const, conf: 55, rsi: 50 },
  { symbol: 'VYM', ruleLegacy: 51, ai: 'hold' as const, conf: 70, rsi: 68 },
  { symbol: '7103', ruleLegacy: 51, ai: 'watch' as const, conf: 50, rsi: 39 },
  { symbol: 'SCHD', ruleLegacy: 46, ai: 'hold' as const, conf: 58, rsi: 45 },
  { symbol: '5225', ruleLegacy: 30, ai: 'hold' as const, conf: 50, rsi: 40 },
  { symbol: '5183', ruleLegacy: 28, ai: 'watch' as const, conf: 48, rsi: 35 },
  { symbol: '5347', ruleLegacy: 26, ai: 'reduce' as const, conf: 65, rsi: 31 },
];

function inp(symbol: string, rsi: number): AiSecondEvaluatorSymbolInput {
  return {
    symbol,
    market: 'bursa',
    displayLabelJa: symbol,
    currentPrice: 10,
    portfolioHolding: { shares: 100, averageBuyPrice: 9, unrealizedPnlPct: 3 },
    rsi14: rsi,
    rsiSource: 'yahoo_finance',
    priceHistoryBars: 120,
    volume: 1,
    volumeSurgeRatio: 1,
    newsSummaryJa: 'n',
    newsHeadlines: [],
    newsCount: 0,
    newsSource: 'News',
    newsApiCount: 0,
    newsApiTitles: [],
    xSentimentSummaryJa: 'n',
    xBullishPct: 0,
    xBearishPct: 0,
    xPostCount: 0,
    xSentimentDisplay: null,
    xFetchSource: 'skipped',
    volumeSource: 'evidence',
    quoteSource: 'yahoo_finance',
    priceAgeSeconds: 60,
    quoteIsStale: false,
  };
}

function legacyScore(ruleScore: number, ai: (typeof TOP10)[0]['ai'], conf: number): number {
  const aiScore = actionConfidenceToDirectionScore(ai, conf);
  return Math.round(ruleScore * 0.7 + aiScore * 0.3);
}

function rec(symbol: string, action: StrategySymbolRecommendation['action']): StrategySymbolRecommendation {
  return {
    symbol,
    market: 'bursa',
    displayLabelJa: symbol,
    action,
    intent: 'watch',
    confidencePct: 72,
    entryTiming: 'none',
    exitTiming: 'none',
    riskReward: {
      expectedUpsidePct: 8,
      downsideRiskPct: 8,
      rewardRiskRatio: 1,
      summaryJa: 'test',
    },
    analystExplanationJa: 'test',
    whyProposedJa: 'test',
    positionSizePct: { conservative: 2, standard: 3, aggressive: 5 },
    opportunityScore: 50,
    threatScore: 30,
  };
}

function minimalBundle(symbols: string[]): StrategyExecutionBundle {
  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeId: 'unknown',
    regimeStrategyJa: 'test',
    todayRecommendations: symbols.map((s) => rec(s, 'reduce')),
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    opportunities: [],
    threats: [],
    allocation: {
      recommendedCashRatioPct: 15,
      cashRatioRationaleJa: '',
      sectorBalanceJa: '',
      concentrationJa: '',
    },
    overallConfidencePct: 50,
    macroNotes: [],
    learningFeedbackJa: [],
    predictionAccuracyJa: null,
    backtest: null,
    journalRecent: [],
    cooldownActive: false,
    cooldownNoteJa: null,
  };
}

describe('hybrid ranking top10 comparison', () => {
  it('prints before/after for focus symbols', () => {
    const before = [...TOP10]
      .map((r) => ({ symbol: r.symbol, finalScore: legacyScore(r.ruleLegacy, r.ai, r.conf) }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((r, i) => ({ rank: i + 1, ...r }));

    const symbols = TOP10.map((r) => r.symbol);
    const bundle = minimalBundle(symbols);
    const evidenceList: ConciergeSymbolEvidence[] = symbols.map((s) => {
      if (s === '1155') return buildMaybank1155OperationalEvidence();
      return {
        ...buildMaybank1155OperationalEvidence(),
        symbol: s,
        intradayChangePct: -1,
      };
    });
    const evidenceBySymbol = new Map(evidenceList.map((e) => [e.symbol.toUpperCase(), e]));
    const batch = {
      fetchedAt: new Date().toISOString(),
      source: 'openai' as const,
      symbols: TOP10.map((r) => ({
        symbol: r.symbol,
        action: r.ai,
        confidence: r.conf,
        rationaleJa: 'test',
      })),
    };
    const enriched = TOP10.map((r) => inp(r.symbol, r.rsi));
    const ranking = buildPerSymbolRankingMap({
      bundle,
      evidenceBySymbol,
      enrichedInputs: enriched,
      batch,
      symbolWeightPct: Object.fromEntries(symbols.map((s) => [s.toUpperCase(), 10])),
    });
    const evalBundle = buildPortfolioAiEvaluation({
      enrichedInputs: enriched,
      batch,
      ruleScoresBySymbol: rankingMapToRuleScores(ranking),
      symbolWeightPct: Object.fromEntries(symbols.map((s) => [s.toUpperCase(), 10])),
      rankingBySymbol: ranking,
    });
    const after = evalBundle.rankedHoldings.map((r) => ({
      rank: r.rank,
      symbol: r.symbol,
      finalScore: r.finalScore,
      action: r.action,
      conflict: ranking.get(r.symbol.toUpperCase())?.conflict ?? false,
    }));

    const focus = ['1155', '0820EA', '4707', '1023'];
    const table = focus.map((sym) => ({
      symbol: sym,
      before: before.find((x) => x.symbol === sym),
      after: after.find((x) => x.symbol === sym),
    }));

    // eslint-disable-next-line no-console
    console.log('\n### Top10 BEFORE (70/30 legacy rule scores)\n', before);
    // eslint-disable-next-line no-console
    console.log('\n### Top10 AFTER (50/50 + conflict + RSI guard)\n', after);
    // eslint-disable-next-line no-console
    console.log('\n### Focus 4 symbols\n', table);

    const r1155 = ranking.get('1155');
    expect(r1155?.conflict).toBe(true);
    expect(r1155?.finalAction).toBe('watch');
  });
});
