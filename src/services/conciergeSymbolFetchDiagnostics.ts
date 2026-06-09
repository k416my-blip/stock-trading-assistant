/**
 * 銘柄分析 — シンボル解決・各API取得結果の診断ログ（Metro: [CONCIERGE_SYMBOL_FETCH]）
 */
import type { Market } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { findStock } from '../data/sampleStocks';
import { getTwelveDataApiKey } from './marketDataApiKey';
import { fetchQuoteViaProviderChain } from './quoteProviderChain';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';
import type { ConciergeSymbolActionGuide } from '../types/conciergeActionGuide';
import type {
  ConciergeAnalysisDiagnostics,
  ConciergeFetchResultRow,
  ConciergeSymbolEvidence,
} from '../types/conciergeEvidence';
import { buildConfidencePointBreakdown } from './conciergeConfidenceBreakdown';
import { buildConciergeNewsQuery } from './conciergeNewsFetchProbe';
import { isLivePriceProvider } from '../constants/quoteProviders';

export type SymbolResolutionResult = {
  inputLabel: string;
  resolvedSymbol: string;
  market: Market;
  companyName: string;
  resolutionJa: string;
};

export function resolveConciergeSymbol(
  userMessage: string,
  symbol: string,
  market: Market,
): SymbolResolutionResult {
  const sample = findStock(symbol);
  const fromMaybank = /maybank|マレー銀行/i.test(userMessage);
  const resolutionJa = fromMaybank
    ? `Maybank → ${symbol}${sample ? ` (${sample.name})` : ''}`
    : `${symbol} (${market})`;
  return {
    inputLabel: fromMaybank ? 'Maybank' : symbol,
    resolvedSymbol: symbol,
    market,
    companyName: sample?.name ?? symbol,
    resolutionJa,
  };
}

function logFetch(payload: Record<string, unknown>): void {
  console.warn('[CONCIERGE_SYMBOL_FETCH]', JSON.stringify(payload));
}

async function probeTwelveData(
  symbol: string,
  market: Market,
): Promise<ConciergeFetchResultRow> {
  const { key: twelveKey } = await getTwelveDataApiKey();
  if (!twelveKey.trim()) {
    const error = 'APIキー未設定';
    return { source: 'twelve_data', ok: false, detailJa: error, error };
  }
  const yahooSymbol = normalizeYahooSymbol(symbol, market);
  const started = Date.now();
  try {
    const result = await fetchQuoteViaProviderChain({
      market,
      positionSymbol: symbol,
      apiSymbol: symbol,
      normalizedSymbol: yahooSymbol,
      currency: market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR',
      twelveDataApiKey: twelveKey,
      timeoutMs: 8_000,
    });
    const provider = result.quote?.provider;
    const price = result.quote?.price;
    const isPriceOk =
      price != null && price > 0 && isLivePriceProvider(provider ?? undefined);
    const elapsedMs = Date.now() - started;
    const detailJa = `provider=${provider ?? 'none'} price=${price ?? '—'} ${elapsedMs}ms`;
    logFetch({ source: 'twelve_data', ok: isPriceOk, symbol, yahooSymbol, provider, price, elapsedMs });
    if (provider === 'yahoo_finance' && isPriceOk) {
      logFetch({ source: 'yahoo', ok: true, symbol, yahooSymbol, provider, price, elapsedMs });
    }
    const error = isPriceOk ? undefined : `価格取得失敗 — provider=${provider ?? 'none'}`;
    return {
      source: 'twelve_data',
      ok: isPriceOk,
      detailJa: isPriceOk ? detailJa : error!,
      error,
      provider,
      price,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logFetch({ source: 'twelve_data', ok: false, symbol, error: msg, elapsedMs: Date.now() - started });
    return { source: 'twelve_data', ok: false, detailJa: msg.slice(0, 120), error: msg.slice(0, 200) };
  }
}

async function probeYahoo(
  symbol: string,
  market: Market,
): Promise<ConciergeFetchResultRow> {
  const yahooSymbol = normalizeYahooSymbol(symbol, market);
  const started = Date.now();
  try {
    const result = await fetchQuoteViaProviderChain({
      market,
      positionSymbol: symbol,
      apiSymbol: symbol,
      normalizedSymbol: yahooSymbol,
      currency: market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR',
      twelveDataApiKey: '',
      timeoutMs: 8_000,
    });
    const provider = result.quote?.provider;
    const price = result.quote?.price;
    const isYahoo =
      provider === 'yahoo_finance' ||
      provider === 'rapidapi_yahoo' ||
      (provider?.includes('yahoo') ?? false);
    const elapsedMs = Date.now() - started;
    const detailJa = `provider=${provider ?? 'none'} price=${price ?? '—'} ${elapsedMs}ms`;
    logFetch({ source: 'yahoo', ok: isYahoo, symbol, yahooSymbol, provider, price, elapsedMs });
    const yahooError = isYahoo ? undefined : `非Yahoo provider: ${provider ?? 'none'}`;
    return {
      source: 'yahoo',
      ok: isYahoo,
      detailJa: isYahoo ? detailJa : `フォールバック ${provider ?? 'none'}: ${detailJa}`,
      error: yahooError,
      provider,
      price,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logFetch({ source: 'yahoo', ok: false, symbol, yahooSymbol, error: msg, elapsedMs: Date.now() - started });
    return { source: 'yahoo', ok: false, detailJa: msg.slice(0, 120), error: msg.slice(0, 200) };
  }
}

function fetchRowError(
  rows: ConciergeFetchResultRow[],
  source: ConciergeFetchResultRow['source'],
): string | undefined {
  return rows.find((r) => r.source === source)?.error;
}

export async function probeConciergeSymbolQuotes(
  symbol: string,
  market: Market,
): Promise<{ twelve: ConciergeFetchResultRow; yahoo: ConciergeFetchResultRow }> {
  const [twelve, yahoo] = await Promise.all([
    probeTwelveData(symbol, market),
    probeYahoo(symbol, market),
  ]);
  return { twelve, yahoo };
}

function fetchRowOk(rows: ConciergeFetchResultRow[], source: ConciergeFetchResultRow['source']): boolean {
  return rows.find((r) => r.source === source)?.ok ?? false;
}

export function logConciergeSymbolFetchSummary(payload: {
  symbol: string;
  resolvedSymbol: string;
  query?: string;
  fetchRows: ConciergeFetchResultRow[];
  sym: ConciergeSymbolEvidence;
  guide: ConciergeSymbolActionGuide;
}): void {
  const { fetchRows, sym, guide } = payload;
  const breakdown = buildConfidencePointBreakdown(sym, guide);
  const newsCount = sym.latestFinancialNews.length;
  const xCount = sym.xSentiment?.postCount ?? 0;

  const twelveError = fetchRowError(fetchRows, 'twelve_data');
  const newsRow = fetchRows.find((r) => r.source === 'newsapi');
  const newsError = newsRow?.ok ? null : fetchRowError(fetchRows, 'newsapi') ?? null;
  const newsProvider = newsRow?.provider === 'rss' ? 'rss' : newsRow?.ok ? 'newsapi' : null;
  const xError = fetchRowError(fetchRows, 'x');

  logFetch({
    symbol: payload.symbol,
    resolvedSymbol: payload.resolvedSymbol,
    query: payload.query ?? `${sym.companyName} ${sym.symbol}`.trim(),
    twelve_ok: fetchRowOk(fetchRows, 'twelve_data'),
    twelveError: twelveError ?? null,
    price_ok: fetchRowOk(fetchRows, 'twelve_data') || fetchRowOk(fetchRows, 'yahoo'),
    yahoo_ok: fetchRowOk(fetchRows, 'yahoo'),
    news_ok: fetchRowOk(fetchRows, 'newsapi'),
    newsProvider,
    newsError,
    x_ok: fetchRowOk(fetchRows, 'x'),
    xError: xError ?? null,
    newsCount,
    xCount,
    confidenceScore: breakdown.confidenceScore,
    confidenceBreakdown: breakdown,
    dataFetchSuccessCount: fetchRows.filter((r) => r.ok).length,
    dataFetchFailCount: fetchRows.filter((r) => !r.ok).length,
  });
}

function newsQueryForLog(sym: ConciergeSymbolEvidence, userMessage: string): string {
  const sample = findStock(sym.symbol);
  return buildConciergeNewsQuery(
    {
      symbol: sym.symbol,
      name: sym.companyName,
      market: sym.market,
      currency: sym.market === 'us' ? 'USD' : sym.market === 'hk' ? 'HKD' : 'MYR',
      price: sym.currentPrice ?? sample?.price ?? 0,
      dividendYield: sample?.dividendYield ?? 0,
      per: sample?.per ?? 0,
      marketCap: sample?.marketCap ?? 0,
      volume: sym.volume ?? sample?.volume ?? 0,
      category: sample?.category ?? 'growth',
    },
    userMessage,
  );
}

export function buildAnalysisDiagnostics(input: {
  userMessage: string;
  symbol: string;
  market: Market;
  fetchRows: ConciergeFetchResultRow[];
  sym: ConciergeSymbolEvidence;
  guide: ConciergeSymbolActionGuide;
  confidenceBasisJa: string;
}): ConciergeAnalysisDiagnostics {
  const resolution = resolveConciergeSymbol(input.userMessage, input.symbol, input.market);
  const successCount = input.fetchRows.filter((r) => r.ok).length;
  const failCount = input.fetchRows.filter((r) => !r.ok).length;
  const usedSources = new Set(
    input.fetchRows.filter((r) => r.ok).map((r) => r.source),
  );
  const newsCount = input.sym.latestFinancialNews.length;
  const xCount = input.sym.xSentiment?.postCount ?? 0;
  const confidenceBreakdown = buildConfidencePointBreakdown(input.sym, input.guide);
  const newsRow = input.fetchRows.find((r) => r.source === 'newsapi');
  const newsProvider =
    newsRow?.provider === 'rss' ? 'rss' : newsRow?.ok ? 'newsapi' : undefined;

  logConciergeSymbolFetchSummary({
    symbol: resolution.inputLabel,
    resolvedSymbol: resolution.resolvedSymbol,
    query: newsQueryForLog(input.sym, input.userMessage),
    fetchRows: input.fetchRows,
    sym: input.sym,
    guide: input.guide,
  });

  return {
    symbol: resolution.inputLabel,
    resolvedSymbol: resolution.resolvedSymbol,
    symbolResolutionJa: resolution.resolutionJa,
    twelveOk: fetchRowOk(input.fetchRows, 'twelve_data'),
    yahooOk: fetchRowOk(input.fetchRows, 'yahoo'),
    newsOk: fetchRowOk(input.fetchRows, 'newsapi'),
    newsProvider,
    xOk: fetchRowOk(input.fetchRows, 'x'),
    twelveError: fetchRowError(input.fetchRows, 'twelve_data'),
    newsError: newsRow?.ok ? undefined : fetchRowError(input.fetchRows, 'newsapi'),
    xError: fetchRowError(input.fetchRows, 'x'),
    newsCount,
    xCount,
    fetchResults: input.fetchRows,
    dataFetchSuccessCount: successCount,
    dataFetchFailCount: failCount,
    usedSourceCount: usedSources.size,
    confidenceScore: confidenceBreakdown.confidenceScore,
    confidenceBreakdown,
    confidenceBasisJa: input.confidenceBasisJa,
  };
}
