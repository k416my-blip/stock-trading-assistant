import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAiSecondEvaluatorInputs,
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function evidence(symbol: string, overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol,
    companyName: symbol,
    market: 'us',
    displayLabelJa: symbol,
    currentPrice: 50,
    previousClose: 49,
    intradayChangePct: 2,
    volume: 500_000,
    volumeSurgeRatio: 1,
    quoteAgeSeconds: 30,
    quoteIsStale: false,
    portfolioHolding: null,
    latestFinancialNews: [],
    newsSummaryJa: '',
    newsSource: 'none',
    xSentiment: null,
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: ['ニュース未取得'],
    ...overrides,
  };
}

describe('aiSecondEvaluator execution logs', () => {
  afterEach(() => {
    resetAiSecondEvaluatorCacheForTest();
    vi.restoreAllMocks();
  });

  it('emits START/RESPONSE/END and skip reason when degraded', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await fetchAiSecondEvaluatorBatch([evidence('MSFT')], {
      degradedMode: true,
      ruleScoresBySymbol: { MSFT: 55 },
    });

    const text = logs.join('\n');
    expect(text).toContain('[AI_EVAL_START]');
    expect(text).toContain('ruleScore 55');
    expect(text).toContain('newsCount 0');
    expect(text).toContain('newsZeroReason');
    expect(text).toContain('xPostCount 0');
    expect(text).toContain('xPostZeroReason');
    expect(text).toContain('[AI_EVAL_OPENAI_SKIPPED]');
    expect(text).toContain('degraded_mode');
    expect(text).toContain('[AI_EVAL_RESPONSE]');
    expect(text).toContain('rsiSource');
    expect(text).toContain('rsiValue');
    expect(text).toContain('priceHistoryBars');
    expect(text).toContain('[AI_EVAL_END]');
  });

  it('buildAiSecondEvaluatorInputs surfaces zero-news and zero-x reasons', () => {
    const inputs = buildAiSecondEvaluatorInputs([evidence('TSLA')]);
    expect(inputs[0]?.newsCount).toBe(0);
    expect(inputs[0]?.newsZeroReason).toBeTruthy();
    expect(inputs[0]?.xPostCount).toBe(0);
    expect(inputs[0]?.xPostZeroReason).toContain('xSentiment=null');
  });
});
