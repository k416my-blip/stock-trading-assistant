import { describe, expect, it } from 'vitest';
import type { PortfolioAiSymbolEvaluation } from '../../src/types/portfolioAiEvaluation';

/** AiActionCenterPanel と同じ key 生成（React 重複 key 防止） */
function evalRowReactKey(section: string, item: PortfolioAiSymbolEvaluation, index: number): string {
  return `${section}-rank${item.rank}-idx${index}-${item.symbol.toUpperCase()}`;
}

function stub(symbol: string, rank: number): PortfolioAiSymbolEvaluation {
  return {
    rank,
    symbol,
    displayLabelJa: symbol,
    action: 'hold',
    confidence: 50,
    rsi14: null,
    rsiSource: null,
    rationaleJa: 'test',
    finalScore: 50,
    ruleScore: 50,
    aiScore: 50,
    displayTone: 'hold',
    dataSources: { quote: null, rsi: null, news: null, x: null },
    weightPct: 0,
  };
}

describe('AiActionCenter evalRowReactKey', () => {
  it('同一 symbol がベスト・ワースト・ランキングに重複しても key は一意', () => {
    const sym = stub('1155', 1);
    const keys = [
      evalRowReactKey('portfolio-ai-best-today', sym, 0),
      evalRowReactKey('portfolio-ai-worst-today', sym, 0),
      evalRowReactKey('portfolio-ai-ranking', sym, 0),
      evalRowReactKey('portfolio-ai-ranking', { ...sym, rank: 2 }, 1),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ランキング内で同一 symbol が二重でも index で key が分かれる', () => {
    const a = stub('AAPL', 1);
    const keys = [
      evalRowReactKey('portfolio-ai-ranking', a, 0),
      evalRowReactKey('portfolio-ai-ranking', a, 1),
    ];
    expect(keys[0]).not.toBe(keys[1]);
  });
});
