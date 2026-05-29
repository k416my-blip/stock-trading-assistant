import type { Market } from './index';

export type AiSecondEvaluatorRsiSource =
  | 'yahoo_finance'
  | 'bursa_malaysia'
  | 'local_price_history'
  | 'insufficient_bars';

/** Phase B — OpenAI 第二評価者の推奨アクション */
export type AiSecondEvaluatorAction = 'buy' | 'reduce' | 'hold' | 'watch';

export type AiSecondEvaluatorSymbolInput = {
  symbol: string;
  market: Market;
  displayLabelJa: string;
  currentPrice: number | null;
  portfolioHolding: {
    shares: number;
    averageBuyPrice: number;
    unrealizedPnlPct: number | null;
  } | null;
  rsi14: number | null;
  volume: number | null;
  volumeSurgeRatio: number | null;
  newsSummaryJa: string;
  newsHeadlines: string[];
  newsCount: number;
  newsSource: string;
  newsZeroReason?: string;
  xSentimentSummaryJa: string;
  xBullishPct: number;
  xBearishPct: number;
  xPostCount: number;
  xSentimentDisplay: string | null;
  xPostZeroReason?: string;
  xFetchSource?: string;
  rsiSource: AiSecondEvaluatorRsiSource;
  /** RSI 計算に使った日足本数 */
  priceHistoryBars: number;
  volumeSource: string;
  quoteSource: string | null;
  priceAgeSeconds: number | null;
  quoteIsStale: boolean;
  newsApiCount: number;
  newsApiTitles: string[];
};

export type AiSecondEvaluatorSymbolResult = {
  symbol: string;
  action: AiSecondEvaluatorAction;
  confidence: number;
  rationaleJa: string;
};

export type AiSecondEvaluatorBatchResult = {
  symbols: AiSecondEvaluatorSymbolResult[];
  source: 'openai' | 'cache' | 'mock_fallback' | 'skipped';
  fetchedAt: string;
  openAiSkippedReason?: string;
  latencyMs?: number;
  tokenUsage?: { input: number; output: number; total: number };
};

export type HybridSymbolScore = {
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  ruleAction: string;
  aiAction: AiSecondEvaluatorAction;
  aiConfidencePct: number;
  fusedAction: AiSecondEvaluatorAction;
  fusedConfidencePct: number;
  rationaleJa?: string;
};
