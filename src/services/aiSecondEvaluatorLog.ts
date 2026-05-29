import type { AiSecondEvaluatorSymbolInput, AiSecondEvaluatorSymbolResult } from '../types/aiSecondEvaluator';

export type AiEvalSkipReason =
  | 'empty_inputs'
  | 'degraded_mode'
  | 'api_requests_paused'
  | 'concierge_ai_paused'
  | 'cache_hit'
  | 'memory_cache_hit'
  | 'no_api_key'
  | 'openai_fetch_failed';

export type AiEvalTokenUsage = {
  input: number;
  output: number;
  total: number;
};

export type AiEvalInputLogRow = {
  symbol: string;
  currentPrice: number | null;
  rsi14: number | null;
  volume: number | null;
  newsCount: number;
  newsSource: string;
  newsZeroReason?: string;
  xPostCount: number;
  xBullishPct: number | null;
  xBearishPct: number | null;
  xSentiment: string | null;
  xPostZeroReason?: string;
  rsiSource: string;
  rsiValue: number | null;
  priceHistoryBars: number;
  volumeSource: string;
  quoteSource: string | null;
  priceAgeSeconds: number | null;
  quoteIsStale: boolean;
  newsApiCount: number;
  newsApiTitles: string;
};

function fmt(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value === 'number' && !Number.isFinite(value)) return 'null';
  return String(value);
}

export function toAiEvalInputLogRow(input: AiSecondEvaluatorSymbolInput): AiEvalInputLogRow {
  return {
    symbol: input.symbol,
    currentPrice: input.currentPrice,
    rsi14: input.rsi14,
    volume: input.volume,
    newsCount: input.newsCount,
    newsSource: input.newsSource,
    newsZeroReason: input.newsZeroReason,
    xPostCount: input.xPostCount,
    xBullishPct: input.xBullishPct,
    xBearishPct: input.xBearishPct,
    xSentiment: input.xSentimentDisplay,
    xPostZeroReason: input.xPostZeroReason,
    rsiSource: input.rsiSource,
    rsiValue: input.rsi14,
    priceHistoryBars: input.priceHistoryBars,
    volumeSource: input.volumeSource,
    quoteSource: input.quoteSource,
    priceAgeSeconds: input.priceAgeSeconds,
    quoteIsStale: input.quoteIsStale,
    newsApiCount: input.newsApiCount,
    newsApiTitles: input.newsApiTitles.join(' | '),
  };
}

export function logAiEvalInputRow(row: AiEvalInputLogRow): void {
  console.log('symbol', row.symbol);
  console.log('currentPrice', fmt(row.currentPrice));
  console.log('RSI', fmt(row.rsi14));
  console.log('volume', fmt(row.volume));
  console.log('newsCount', row.newsCount);
  console.log('newsSource', row.newsSource);
  if (row.newsCount === 0 && row.newsZeroReason) {
    console.log('newsZeroReason', row.newsZeroReason);
  }
  console.log('xPostCount', row.xPostCount);
  console.log('xBullishPct', fmt(row.xBullishPct));
  console.log('xBearishPct', fmt(row.xBearishPct));
  console.log('xSentiment', row.xSentiment ?? 'null');
  console.log('rsiSource', row.rsiSource);
  console.log('rsiValue', fmt(row.rsiValue));
  console.log('priceHistoryBars', row.priceHistoryBars);
  console.log('quoteSource', row.quoteSource ?? 'null');
  console.log('priceAgeSeconds', fmt(row.priceAgeSeconds));
  console.log('quoteIsStale', row.quoteIsStale);
  console.log('volumeSource', row.volumeSource);
  console.log('newsApiCount', row.newsApiCount);
  console.log('newsApiTitles', row.newsApiTitles.length > 0 ? row.newsApiTitles : '(none)');
  if (row.xPostCount === 0 && row.xPostZeroReason) {
    console.log('xPostZeroReason', row.xPostZeroReason);
  }
}

export function logAiEvalStart(symbol: string, ruleScore: number | null, input: AiSecondEvaluatorSymbolInput): void {
  console.log('[AI_EVAL_START]');
  console.log('symbol', symbol);
  console.log('ruleScore', ruleScore == null ? 'n/a' : ruleScore);
  logAiEvalInputRow(toAiEvalInputLogRow(input));
}

export function logAiEvalResponse(
  result: AiSecondEvaluatorSymbolResult,
  tokens: AiEvalTokenUsage | null,
): void {
  console.log('[AI_EVAL_RESPONSE]');
  console.log('action', result.action);
  console.log('confidence', result.confidence);
  console.log('rationaleJa', JSON.stringify(result.rationaleJa));
  console.log('tokens', tokens ? tokens.total : 0);
}

export function logAiEvalEnd(latencyMs: number, extra?: Record<string, unknown>): void {
  console.log('[AI_EVAL_END]');
  console.log('latency', `${latencyMs}ms`);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      console.log(key, value);
    }
  }
}

export function logAiEvalPrompt(prompt: string): void {
  console.log('[AI_EVAL_PROMPT]');
  console.log(prompt);
}

export function logAiEvalOpenAiSkipped(reason: AiEvalSkipReason, detail?: string): void {
  console.log('[AI_EVAL_OPENAI_SKIPPED]');
  console.log('reason', reason);
  if (detail) console.log('detail', detail);
}
