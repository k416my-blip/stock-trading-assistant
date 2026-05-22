import { SYMBOL_EXPLORING_MESSAGE, YAHOO_SYMBOL_NOT_FOUND_MESSAGE } from '../../constants/yahooFinance';
import { sanitizeErrorForUi } from '../../utils/sanitizeUiError';
import type { Currency } from '../../types';
import type { QuoteFetchDebugInfo } from '../../types/quoteFetchDebug';
import type { ProviderQuote } from '../../types/quoteProvider';
import { normalizeBursaCoreSymbol } from '../bursaSymbolFormat';
import { MarketDataError } from '../marketDataService';
import {
  getYahooSymbolAlias,
  hydrateYahooSymbolAliasCache,
  isYahooSymbolFailureCached,
  recordYahooSymbolFailure,
  resolveYahooSymbolsToTry,
  saveYahooSymbolAlias,
  throwYahooSymbolNotFoundCached,
} from '../yahooSymbolAliasCache';
import { buildYahooChartUrl, fetchYahooFinanceQuote } from './yahooFinanceQuote';
import {
  pickBursaMalaysiaSearchQuote,
  searchYahooFinance,
  type YahooSearchQuote,
} from './yahooFinanceSearch';
export type YahooBursaFetchOptions = {
  normalizedSymbol: string;
  apiSymbol: string;
  currency: Currency;
  timeoutMs?: number;
  onExplore?: (info: QuoteFetchDebugInfo) => void;
};

function errMessage(err: unknown): string {
  if (err instanceof MarketDataError) {
    return sanitizeErrorForUi(err.message, err.message);
  }
  if (err instanceof Error) return sanitizeErrorForUi(err.message);
  if (err && typeof err === 'object' && 'message' in err) {
    return sanitizeErrorForUi(String((err as { message: unknown }).message));
  }
  return sanitizeErrorForUi(String(err));
}

async function trySymbol(
  core: string,
  yahooSymbol: string,
  currency: Currency,
  timeoutMs: number | undefined,
  onExplore: YahooBursaFetchOptions['onExplore'],
  tried: string[],
): Promise<ProviderQuote | null> {
  const requestUrl = buildYahooChartUrl(yahooSymbol);
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  onExplore?.({
    coreSymbol: core,
    requestUrl,
    resolvedSymbol: undefined,
    provider: 'yahoo_finance',
    triedSymbols: [...tried],
    lastError: SYMBOL_EXPLORING_MESSAGE,
  });

  try {
    const seed = getYahooSymbolAlias(core);
    const quote = await fetchYahooFinanceQuote(yahooSymbol, currency, timeoutMs, (meta) => {
      lastStatus = meta.httpStatus;
      onExplore?.({
        coreSymbol: core,
        shortName: seed?.shortName,
        requestUrl: meta.requestUrl,
        responseCode: meta.httpStatus,
        resolvedSymbol: yahooSymbol,
        price: meta.price,
        provider: 'yahoo_finance',
        triedSymbols: [...tried, yahooSymbol],
        lastError: meta.errorMessage ? sanitizeErrorForUi(meta.errorMessage) : undefined,
      });
    });
    onExplore?.({
      coreSymbol: core,
      shortName: seed?.shortName,
      requestUrl,
      responseCode: lastStatus ?? 200,
      resolvedSymbol: quote.symbol,
      price: quote.price,
      provider: 'yahoo_finance',
      triedSymbols: [...tried, yahooSymbol],
    });
    return quote;
  } catch (err) {
    lastError = errMessage(err);
    onExplore?.({
      coreSymbol: core,
      requestUrl,
      responseCode: lastStatus,
      resolvedSymbol: undefined,
      provider: 'yahoo_finance',
      triedSymbols: [...tried, yahooSymbol],
      lastError,
    });
    console.log('[yahoo-search] CANDIDATE_FAIL', { core, yahooSymbol, status: lastStatus, error: lastError });
    return null;
  }
}

async function persistWinner(
  core: string,
  yahooSymbol: string,
  pick?: YahooSearchQuote,
  source: 'hardcoded' | 'search' | 'success' = 'success',
): Promise<void> {
  const seed = getYahooSymbolAlias(core);
  await saveYahooSymbolAlias(core, {
    yahooSymbol,
    shortName: pick?.shortname ?? seed?.shortName,
    exchange: pick?.exchange ?? seed?.exchange ?? 'KLS',
    longName: pick?.longname ?? seed?.longName,
    source,
  });
}

/**
 * Bursa: hardcoded map → 候補自動テスト → Yahoo search → 最初の成功 symbol を永続保存
 */
export async function fetchYahooFinanceQuoteForBursa(
  normalizedSymbol: string,
  apiSymbol: string,
  currency: Currency,
  timeoutMs?: number,
  onExplore?: (info: QuoteFetchDebugInfo) => void,
): Promise<ProviderQuote> {
  await hydrateYahooSymbolAliasCache();
  const core = normalizeBursaCoreSymbol(normalizedSymbol);

  if (isYahooSymbolFailureCached(core)) {
    console.log('[yahoo-search] SKIP_FAILURE_CACHE', { core });
    throwYahooSymbolNotFoundCached(core);
  }

  const symbolsToTry = await resolveYahooSymbolsToTry(core, apiSymbol);
  console.log('[yahoo-search] SYMBOLS_TO_TRY', { core, symbolsToTry });

  const tried: string[] = [];
  const seed = getYahooSymbolAlias(core);

  for (const yahooSymbol of symbolsToTry) {
    tried.push(yahooSymbol);
    onExplore?.({
      coreSymbol: core,
      requestUrl: buildYahooChartUrl(yahooSymbol),
      provider: 'yahoo_finance',
      triedSymbols: [...tried],
      lastError: SYMBOL_EXPLORING_MESSAGE,
    });

    const quote = await trySymbol(core, yahooSymbol, currency, timeoutMs, onExplore, tried.slice(0, -1));
    if (quote) {
      await persistWinner(core, quote.symbol, undefined, seed?.source === 'hardcoded' ? 'hardcoded' : 'success');
      console.log('[yahoo-search] CHART_SUCCESS', {
        core,
        yahooSymbol: quote.symbol,
        price: quote.price,
      });
      return quote;
    }
  }

  console.log('[yahoo-search] SEARCH_REPROBE', { core, query: core });
  const searchQuotes = await searchYahooFinance(core, timeoutMs);
  const pick = pickBursaMalaysiaSearchQuote(searchQuotes, core);

  const searchSymbols = pick ? [pick.symbol] : [];
  for (const extra of symbolsToTry) {
    if (!searchSymbols.includes(extra)) searchSymbols.push(extra);
  }

  if (pick) {
    console.log('[yahoo-search] BURSA_PICK', {
      core,
      symbol: pick.symbol,
      exchange: pick.exchange,
      shortname: pick.shortname,
      longname: pick.longname,
    });
  }

  for (const yahooSymbol of searchSymbols) {
    const alreadyTried = tried.includes(yahooSymbol);
    if (!alreadyTried) tried.push(yahooSymbol);
    const quote = await trySymbol(
      core,
      yahooSymbol,
      currency,
      timeoutMs,
      onExplore,
      alreadyTried ? tried : tried.slice(0, -1),
    );
    if (quote) {
      await persistWinner(core, quote.symbol, pick ?? undefined, pick ? 'search' : 'success');
      return quote;
    }
  }

  console.log('[yahoo-search] ALL_CANDIDATES_FAILED', { core, tried });

  await recordYahooSymbolFailure(core, tried[tried.length - 1], YAHOO_SYMBOL_NOT_FOUND_MESSAGE);

  throw new MarketDataError('symbol_invalid', YAHOO_SYMBOL_NOT_FOUND_MESSAGE, {
    rawMessage: `${YAHOO_SYMBOL_NOT_FOUND_MESSAGE}（試行: ${tried.join(', ')}）`,
    lastProvider: 'yahoo_finance',
    normalizedSymbol: tried[tried.length - 1] ?? `${core}.KL`,
  });
}
