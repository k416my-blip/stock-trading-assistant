/**
 * 0820EA が bestToday になる理由の診断（Metro 相当の数値を stdout に出力）
 * 実行: npx vitest run tests/unit/portfolioBestTodayDiagnostic.test.ts
 */
import { describe, it } from 'vitest';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import type { AiSecondEvaluatorSymbolInput } from '../../src/types/aiSecondEvaluator';
import type { AiSecondEvaluatorBatchResult } from '../../src/types/aiSecondEvaluator';

function inp(
  symbol: string,
  rsi14: number,
  opts?: Partial<AiSecondEvaluatorSymbolInput>,
): AiSecondEvaluatorSymbolInput {
  return {
    symbol,
    market: 'bursa',
    displayLabelJa: symbol,
    currentPrice: 10,
    portfolioHolding: { shares: 100, averageBuyPrice: 9, unrealizedPnlPct: 5 },
    rsi14,
    rsiSource: 'yahoo_finance',
    priceHistoryBars: 120,
    volume: 1,
    volumeSurgeRatio: 1,
    newsSummaryJa: '中立',
    newsHeadlines: [],
    newsCount: 1,
    newsSource: 'Yahoo Finance RSS',
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
    ...opts,
  };
}

function printRanking(label: string, enrichedInputs: AiSecondEvaluatorSymbolInput[], batch: AiSecondEvaluatorBatchResult, ruleScores: Record<string, number>, weights: Record<string, number>) {
  const beforeSort = enrichedInputs.map((i) => {
    const sym = i.symbol.toUpperCase();
    const hit = batch.symbols.find((s) => s.symbol.toUpperCase() === sym);
    return { symbol: i.symbol, order: 'enrichedInputs順', ai: hit ?? null };
  });

  const result = buildPortfolioAiEvaluation({
    enrichedInputs,
    batch,
    ruleScoresBySymbol: ruleScores,
    symbolWeightPct: weights,
  });

  const bestAll = result.bestToday.map((b) => ({ symbol: b.symbol, finalScore: b.finalScore }));
  const rankedAll = result.rankedHoldings.map((r) => ({
    rank: r.rank,
    symbol: r.symbol,
    finalScore: r.finalScore,
    ruleScore: r.ruleScore,
    aiScore: r.aiScore,
  }));
  const without0820 = result.rankedHoldings.filter((r) => r.symbol.toUpperCase() !== '0820EA');
  const altBest = without0820[0] ?? null;

  // eslint-disable-next-line no-console
  console.log(`\n========== ${label} ==========`);
  // eslint-disable-next-line no-console
  console.log('1. bestToday (全件)', JSON.stringify(bestAll, null, 2));
  // eslint-disable-next-line no-console
  console.log('2a. ソート前 (enrichedInputs 投入順)', JSON.stringify(beforeSort, null, 2));
  // eslint-disable-next-line no-console
  console.log('2b. ソート後 rankedHoldings', JSON.stringify(rankedAll, null, 2));
  // eslint-disable-next-line no-console
  console.log('3. 0820EA除外時 bestToday[0]', altBest ? { symbol: altBest.symbol, finalScore: altBest.finalScore } : null);
  // eslint-disable-next-line no-console
  console.log('batchSource:', result.batchSource);
}

describe('portfolio bestToday diagnostic', () => {
  it('prints rankings for Bursa-heavy portfolio (operational-like)', () => {
    const enrichedInputs = [
      inp('1155', 68),
      inp('1023', 55),
      inp('4707', 50),
      inp('0820EA', 32),
    ];
    const batch: AiSecondEvaluatorBatchResult = {
      fetchedAt: new Date().toISOString(),
      source: 'openai',
      symbols: [
        { symbol: '1155', action: 'reduce', confidence: 55, rationaleJa: 'RSI高め' },
        { symbol: '1023', action: 'hold', confidence: 58, rationaleJa: '中立' },
        { symbol: '4707', action: 'hold', confidence: 52, rationaleJa: '中立' },
        { symbol: '0820EA', action: 'hold', confidence: 60, rationaleJa: 'RSI低め' },
      ],
    };
    printRanking('Bursa 4銘柄 (operational-like AI batch)', enrichedInputs, batch, {
      '1155': 40,
      '1023': 48,
      '4707': 50,
      '0820EA': 50,
    }, {
      '1155': 25,
      '1023': 25,
      '4707': 25,
      '0820EA': 25,
    });
  });

  it('prints rankings when only 0820EA is held', () => {
    const enrichedInputs = [inp('0820EA', 32)];
    const batch: AiSecondEvaluatorBatchResult = {
      fetchedAt: new Date().toISOString(),
      source: 'openai',
      symbols: [{ symbol: '0820EA', action: 'hold', confidence: 60, rationaleJa: 'RSI低め' }],
    };
    printRanking('単一保有 0820EA', enrichedInputs, batch, { '0820EA': 50 }, { '0820EA': 100 });
  });

  it('prints unit-test fixture (0820EA vs 1155)', () => {
    const enrichedInputs = [inp('0820EA', 32), inp('1155', 68)];
    const batch: AiSecondEvaluatorBatchResult = {
      fetchedAt: new Date().toISOString(),
      source: 'openai',
      symbols: [
        { symbol: '0820EA', action: 'hold', confidence: 60, rationaleJa: 'RSI低め' },
        { symbol: '1155', action: 'reduce', confidence: 55, rationaleJa: 'RSI高め' },
      ],
    };
    printRanking('vitest fixture 0820EA+1155', enrichedInputs, batch, { '0820EA': 50, '1155': 40 }, { '0820EA': 60, '1155': 40 });
  });
});
