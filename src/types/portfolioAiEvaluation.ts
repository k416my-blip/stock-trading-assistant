import type { AiSecondEvaluatorAction } from './aiSecondEvaluator';

/** UI 色分け — 買い / 保有 / 売り */
export type PortfolioAiDisplayTone = 'buy' | 'hold' | 'sell';

export type PortfolioAiDataSources = {
  quote: string | null;
  rsi: string | null;
  news: string | null;
  x: string | null;
};

export type PortfolioAiSymbolEvaluation = {
  rank: number;
  symbol: string;
  displayLabelJa: string;
  action: AiSecondEvaluatorAction;
  confidence: number;
  rsi14: number | null;
  rsiSource: string | null;
  rationaleJa: string;
  finalScore: number;
  ruleScore: number;
  aiScore: number;
  displayTone: PortfolioAiDisplayTone;
  dataSources: PortfolioAiDataSources;
  weightPct: number;
};

export type PortfolioAiEvaluationBundle = {
  generatedAt: string;
  evaluatedAtJa: string;
  portfolioScore: number;
  holdingCount: number;
  batchSource: string;
  rankedHoldings: PortfolioAiSymbolEvaluation[];
  bestToday: PortfolioAiSymbolEvaluation[];
  worstToday: PortfolioAiSymbolEvaluation[];
  riskWarnings: string[];
};
