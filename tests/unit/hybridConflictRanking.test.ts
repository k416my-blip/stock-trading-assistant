import { describe, expect, it } from 'vitest';
import { HYBRID_AI_SCORE_WEIGHT, HYBRID_RULE_SCORE_WEIGHT } from '../../src/constants/hybridStrategyScore';
import {
  isHybridRankingConflict,
  resolvePerSymbolRanking,
  resolveRankingRuleAction,
} from '../../src/services/hybridRankingConflict';
import { resolveStrategyAction } from '../../src/services/strategyExecutionEngine';
import { buildMaybank1155OperationalEvidence } from '../../src/services/strategyRuleScoreAudit';
import { computeFinalHybridScore } from '../../src/services/hybridStrategyScoreFusion';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import type { AiSecondEvaluatorSymbolInput } from '../../src/types/aiSecondEvaluator';
import {
  buildPerSymbolRankingMap,
  rankingMapToRuleScores,
} from '../../src/services/hybridRankingConflict';
import { actionConfidenceToDirectionScore } from '../../src/services/hybridStrategyScoreFusion';

function inp1155(): AiSecondEvaluatorSymbolInput {
  return {
    symbol: '1155',
    market: 'bursa',
    displayLabelJa: '1155',
    currentPrice: 10,
    portfolioHolding: { shares: 100, averageBuyPrice: 9, unrealizedPnlPct: 4 },
    rsi14: 23,
    rsiSource: 'yahoo_finance',
    priceHistoryBars: 120,
    volume: 1,
    volumeSurgeRatio: 1,
    newsSummaryJa: '中立',
    newsHeadlines: [],
    newsCount: 1,
    newsSource: 'News',
    newsApiCount: 0,
    newsApiTitles: [],
    xSentimentSummaryJa: '中立',
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

describe('hybrid ranking conflict', () => {
  it('detects conflict when rule REDUCE and AI BUY >= 65', () => {
    expect(isHybridRankingConflict('reduce', 'buy', 75)).toBe(true);
    expect(isHybridRankingConflict('reduce', 'buy', 64)).toBe(false);
    expect(isHybridRankingConflict('reduce', 'hold', 80)).toBe(false);
  });

  it('downgrades REDUCE to WATCH when conflict (AI BUY 75)', () => {
    const r = resolveRankingRuleAction('reduce', 'buy', 75);
    expect(r.conflict).toBe(true);
    expect(r.effectiveRuleAction).toBe('watch');
    expect(r.finalAction).toBe('watch');
  });

  it('RSI 23 blocks sharp_drop reduce → watch before conflict resolution', () => {
    const sym = buildMaybank1155OperationalEvidence();
    const raw = resolveStrategyAction(sym, 'cautious', 25, 23);
    expect(raw).toBe('watch');
  });

  it('Rule REDUCE + AI BUY 75 + RSI 23 → final action WATCH in portfolio eval', () => {
    const sym = buildMaybank1155OperationalEvidence();
    expect(resolveStrategyAction(sym, 'cautious', 25, 23)).toBe('watch');
    expect(resolveStrategyAction(sym, 'cautious', 25, 23, { skipRsiOversoldGuard: true })).toBe(
      'reduce',
    );

    const resolved = resolvePerSymbolRanking('reduce', 72, 'buy', 75, 'watch');
    expect(resolved.conflict).toBe(true);
    expect(resolved.effectiveRuleAction).toBe('watch');
    expect(resolved.finalAction).toBe('watch');

    const batch = {
      fetchedAt: new Date().toISOString(),
      source: 'openai' as const,
      symbols: [{ symbol: '1155', action: 'buy' as const, confidence: 75, rationaleJa: 'test' }],
    };
    const ranking = new Map([['1155', resolved]]);
    const evalBundle = buildPortfolioAiEvaluation({
      enrichedInputs: [inp1155()],
      batch,
      ruleScoresBySymbol: rankingMapToRuleScores(ranking),
      symbolWeightPct: { '1155': 25 },
      rankingBySymbol: ranking,
    });
    expect(evalBundle.rankedHoldings[0]!.action).toBe('watch');
  });

  it('uses 50/50 hybrid weights', () => {
    expect(HYBRID_RULE_SCORE_WEIGHT).toBe(0.5);
    expect(HYBRID_AI_SCORE_WEIGHT).toBe(0.5);
    expect(computeFinalHybridScore(45, 75)).toBe(60);
  });
});

describe('hybrid ranking before/after (4 symbols)', () => {
  const FOUR = [
    { symbol: '1155', rule: 28, ai: 'buy' as const, conf: 75, rsi: 23 },
    { symbol: '0820EA', rule: 50, ai: 'hold' as const, conf: 60, rsi: 32 },
    { symbol: '4707', rule: 50, ai: 'hold' as const, conf: 55, rsi: 26 },
    { symbol: '1023', rule: 45, ai: 'hold' as const, conf: 55, rsi: 50 },
  ];

  function rankFour(useLegacy70_30: boolean) {
    const wR = useLegacy70_30 ? 0.7 : 0.5;
    const wA = useLegacy70_30 ? 0.3 : 0.5;
    const score = (ruleScore: number, aiAction: (typeof FOUR)[0]['ai'], conf: number) => {
      const aiScore = actionConfidenceToDirectionScore(aiAction, conf);
      return Math.round((ruleScore * wR + aiScore * wA) / (wR + wA));
    };

    return [...FOUR]
      .map((r) => ({
        symbol: r.symbol,
        finalScore: score(r.rule, r.ai, r.conf),
      }))
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  it('prints before/after for 1155 0820EA 4707 1023', () => {
    const before = rankFour(true);
    const after = rankFour(false);
    // eslint-disable-next-line no-console
    console.log('\n### Ranking 4 symbols BEFORE 70/30\n', before);
    // eslint-disable-next-line no-console
    console.log('\n### Ranking 4 symbols AFTER 50/50 + conflict rules in pipeline\n', after);

    const b1155 = before.find((x) => x.symbol === '1155')!.finalScore;
    const a1155 = after.find((x) => x.symbol === '1155')!.finalScore;
    expect(a1155).toBeGreaterThan(b1155);
  });
});
