/**
 * refreshProactive 相当 — Metro [DAILY_COMMENT_TARGET] / [PORTFOLIO_BEST_TODAY] 実データ
 * npx vitest run tests/live/proactiveRefreshMetroVerify.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import { buildSymbolWeightPctMap } from '../../src/services/metaDecisionPortfolioWeights';
import { buildStrategyExecutionBundle } from '../../src/services/strategyExecutionEngine';
import { defaultStrategyExecutionState } from '../../src/services/strategyExecutionStorage';
import { enhanceStrategyBundleWithHybridEvaluator } from '../../src/services/strategyHybridEnhancement';
import { getActivePortfolio } from '../../src/services/portfolioPriceUpdate';
import { buildAiDailyComment } from '../../src/services/aiDailyCommentBuilder';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

function parseWarn(tag: string): unknown {
  const line = warnSpy.mock.calls.find((c) => c[0] === tag);
  if (!line?.[1]) return null;
  return typeof line[1] === 'string' ? JSON.parse(line[1]) : line[1];
}

describe('proactive refresh Metro verify (live pipeline)', () => {
  beforeEach(async () => {
    warnSpy.mockClear();
    await bootstrapSecretsForAiEvalProbe();
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  it('runs refreshProactive pipeline and emits DAILY_COMMENT_TARGET + PORTFOLIO_BEST_TODAY', async () => {
    const state = buildProbeAppState(10, 'bursa-first');
    const holdings = getActivePortfolio(state);
    const apiKeys = await loadAnalysisApiKeys();

    const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
    const symbolWeightPct = buildSymbolWeightPctMap(holdings);
    let bundle = buildStrategyExecutionBundle(
      {
        evidenceSymbols: evidence.symbols,
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct,
        tacticalMode: 'balanced',
        regimeId: 'sideways',
      },
      defaultStrategyExecutionState(),
    );

    bundle = await enhanceStrategyBundleWithHybridEvaluator(bundle, evidence.symbols, {
      symbolWeightPct,
      forceAi: true,
    });

    const portfolio = bundle.portfolioAiEvaluation!;
    expect(portfolio).toBeTruthy();

    buildAiDailyComment({
      bundle,
      portfolio,
      holdings: state.portfolio,
      activeSignals: [],
    });

    const bestTodayLog = parseWarn('[PORTFOLIO_BEST_TODAY]') as {
      bestToday: Array<{ symbol: string; finalScore: number; action: string; conflict: boolean }>;
      rankedTop10: Array<{ symbol: string; finalScore: number; action: string; conflict: boolean }>;
    } | null;
    const dailyLog = parseWarn('[DAILY_COMMENT_TARGET]') as {
      symbol: string;
      score: number;
      action: string;
      conflict: boolean;
    } | null;

    // eslint-disable-next-line no-console
    console.log('\n=== Metro [PORTFOLIO_BEST_TODAY] ===\n', JSON.stringify(bestTodayLog, null, 2));
    // eslint-disable-next-line no-console
    console.log('\n=== Metro [DAILY_COMMENT_TARGET] ===\n', JSON.stringify(dailyLog, null, 2));

    expect(bestTodayLog).toBeTruthy();
    expect(dailyLog).toBeTruthy();
    expect(dailyLog!.symbol).toBe(bestTodayLog!.bestToday[0]?.symbol);
    expect(dailyLog!.score).toBe(bestTodayLog!.bestToday[0]?.finalScore);
    expect(dailyLog!.action).toBe(bestTodayLog!.bestToday[0]?.action);

    const comment = buildAiDailyComment({ bundle, portfolio, holdings: state.portfolio });
    expect(comment.todaySummaryJa).toContain(dailyLog!.symbol);
    expect(comment.todaySummaryJa).toContain(String(dailyLog!.score));

    const focus = ['1155', '0820EA', '4707', '1023'];
    const focusRows = focus.map((sym) =>
      bestTodayLog!.rankedTop10.find((r) => r.symbol.toUpperCase().includes(sym.replace('.KL', ''))),
    );
    // eslint-disable-next-line no-console
    console.log('\n=== Focus 4 symbols ===\n', JSON.stringify(focusRows, null, 2));
  }, 180_000);
});
