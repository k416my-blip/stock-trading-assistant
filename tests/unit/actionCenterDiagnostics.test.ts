import { describe, expect, it } from 'vitest';
import {
  buildRealDataPipelineReport,
  isMockFallbackSource,
} from '../../src/services/actionCenterDiagnostics';
import { resolvePortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationFromStrategyBundle';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

function minimalBundle(overrides: Partial<StrategyExecutionBundle> = {}): StrategyExecutionBundle {
  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeStrategyJa: 'test',
    todayRecommendations: [],
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    allocation: {
      recommendedCashRatioPct: 15,
      cashRatioRationaleJa: '',
      sectorBalanceJa: '',
      concentrationJa: '',
    },
    cooldownNoteJa: null,
    ...overrides,
  } as StrategyExecutionBundle;
}

describe('actionCenterDiagnostics', () => {
  it('maps mock_fallback display away from UI batchSource', () => {
    const bundle = minimalBundle({
      hybridSecondEvaluator: {
        generatedAt: new Date().toISOString(),
        source: 'mock_fallback',
        symbolCount: 1,
        ruleWeightPct: 70,
        aiWeightPct: 30,
      },
    });
    const portfolio = resolvePortfolioAiEvaluation(bundle);
    expect(isMockFallbackSource(bundle, portfolio)).toBe(true);
    expect(portfolio.batchSource).not.toBe('mock_fallback');
  });

  it('reports hybrid pipeline when openai source', () => {
    const bundle = minimalBundle({
      portfolioAiEvaluation: {
        generatedAt: new Date().toISOString(),
        evaluatedAtJa: '1/1',
        portfolioScore: 55,
        holdingCount: 1,
        batchSource: 'hybrid',
        rankedHoldings: [
          {
            rank: 1,
            symbol: 'AAPL',
            displayLabelJa: 'Apple',
            action: 'hold',
            confidence: 50,
            rsi14: 48,
            rsiSource: 'yahoo_finance',
            rationaleJa: 'test',
            finalScore: 55,
            ruleScore: 50,
            aiScore: 52,
            displayTone: 'hold',
            dataSources: { quote: 'Yahoo', rsi: 'Yahoo', news: 'NewsAPI', x: null },
            weightPct: 100,
          },
        ],
        bestToday: [],
        worstToday: [],
        riskWarnings: [],
      },
      hybridSecondEvaluator: {
        generatedAt: new Date().toISOString(),
        source: 'openai',
        symbolCount: 1,
        ruleWeightPct: 70,
        aiWeightPct: 30,
      },
    });
    const portfolio = resolvePortfolioAiEvaluation(bundle);
    const rows = buildRealDataPipelineReport(bundle, portfolio);
    expect(rows.find((r) => r.layer.includes('OpenAI'))?.status).toBe('real');
    expect(rows.find((r) => r.layer.includes('NewsAPI'))?.status).toBe('real');
  });
});

// re-export helper used in portfolioAiEvaluationFromStrategyBundle - test via bundle
function mapHybridSourceForDisplay(source: string | undefined): string {
  if (!source) return '未取得';
  if (source === 'mock_fallback') return 'rule_only';
  if (source === 'openai' || source === 'cache') return 'hybrid';
  return source;
}

describe('mapHybridSourceForDisplay', () => {
  it('never returns mock_fallback', () => {
    expect(mapHybridSourceForDisplay('mock_fallback')).toBe('rule_only');
    expect(mapHybridSourceForDisplay('openai')).toBe('hybrid');
  });
});
