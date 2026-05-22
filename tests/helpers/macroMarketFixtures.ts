import type { GlobalMarketAnalysisBundle } from '../../src/types/globalMarketAnalysis';

export function buildTestGlobalMarket(
  overrides: Partial<GlobalMarketAnalysisBundle> = {},
): GlobalMarketAnalysisBundle {
  return {
    generatedAt: new Date().toISOString(),
    regimeId: 'sideways',
    regimeLabelJa: '横ばい',
    regimeSummaryJa: 'テスト用スタブ',
    regimeConfidencePct: 50,
    indices: [
      {
        id: 'nasdaq',
        labelJa: 'Nasdaq',
        region: 'us',
        yahooSymbol: '^IXIC',
        price: 100,
        changePct: 0.5,
        fromLive: false,
        staleNoteJa: null,
      },
    ],
    sectors: [
      {
        id: 'semiconductor',
        labelJa: '半導体',
        etfSymbol: 'SOXX',
        changePct: 1.2,
        momentumScore: 60,
        leadershipRank: 1,
      },
      {
        id: 'energy',
        labelJa: 'エネルギー',
        etfSymbol: 'XLE',
        changePct: 0.3,
        momentumScore: 52,
        leadershipRank: 2,
      },
      {
        id: 'banking',
        labelJa: '銀行',
        etfSymbol: 'XLF',
        changePct: -0.2,
        momentumScore: 48,
        leadershipRank: 3,
      },
    ],
    vix: {
      id: 'vix',
      labelJa: 'VIX',
      yahooSymbol: '^VIX',
      value: 18,
      changePct: 0,
      unitJa: 'pt',
      fromLive: false,
    },
    forex: [
      {
        id: 'dxy',
        labelJa: 'DXY',
        yahooSymbol: 'DX-Y.NYB',
        value: 104,
        changePct: 0.1,
        unitJa: 'pt',
        fromLive: false,
      },
      {
        id: 'usdjpy',
        labelJa: 'USD/JPY',
        yahooSymbol: 'JPY=X',
        value: 150,
        changePct: 0.2,
        unitJa: '円',
        fromLive: false,
      },
    ],
    rates: [
      {
        id: 'us10y',
        labelJa: '米10年',
        yahooSymbol: '^TNX',
        value: 4.2,
        changePct: 0.02,
        unitJa: '%',
        fromLive: false,
      },
    ],
    correlations: [
      {
        pairLabelJa: '半導体 ↔ Nasdaq',
        correlationHintJa: '連動',
        strength: 'strong',
      },
    ],
    marketScores: {
      marketRiskScore: 50,
      fearScore: 45,
      momentumScore: 52,
      liquidityScore: 55,
    },
    marketWideFactorsJa: ['テスト市場'],
    individualVsMarketNoteJa: 'テスト',
    macroContextBulletsJa: [],
    dataGapsJa: [],
    insufficientData: false,
    sourceNoteJa: 'test fixture',
    ...overrides,
  };
}
