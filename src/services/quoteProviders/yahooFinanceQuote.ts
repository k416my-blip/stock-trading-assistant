import { YAHOO_CHART_PARSE_FAILED_MESSAGE } from '../../constants/yahooFinance';
import type { Currency } from '../../types';
import type { ProviderQuote } from '../../types/quoteProvider';
import { isValidQuotePrice, normalizeQuotePrice } from '../../utils/safeNumeric';
import { sanitizeErrorForUi } from '../../utils/sanitizeUiError';
import { parseYahooCompanyName } from '../../utils/companyNameResolver';
import {
  getYahooChartResult,
  logYahooCloseArrayFor4707,
  parseYahooPrice,
  type YahooChartJson,
} from '../../utils/yahooChartParser';
import { logQuoteFetchFailure } from '../quoteFetchDiagnostics';
import { MarketDataError } from '../marketDataService';
import { isHtmlResponse } from '../../utils/httpFetchDiagnostics';
import {
  classifyProviderHttpError,
  fetchHttpWithRetry,
  type ProviderFetchError,
} from './providerFetchUtil';

export function buildYahooChartUrl(yahooSymbol: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
}

export type YahooQuoteAttemptMeta = {
  yahooSymbol: string;
  requestUrl: string;
  httpStatus: number;
  ok: boolean;
  errorMessage?: string;
  price?: number;
};

export async function fetchYahooFinanceQuote(
  yahooSymbol: string,
  currency: Currency,
  timeoutMs?: number,
  onAttempt?: (meta: YahooQuoteAttemptMeta) => void,
): Promise<ProviderQuote> {
  const url = buildYahooChartUrl(yahooSymbol);

  let httpResult;
  try {
    httpResult = await fetchHttpWithRetry(url, {
      timeoutMs,
      logLabel: 'yahoo_finance',
      symbol: yahooSymbol,
    });
  } catch (err) {
    const e = err as ProviderFetchError;
    const uiMessage = sanitizeErrorForUi(e.message, e.message);
    logQuoteFetchFailure({
      provider: 'yahoo_finance',
      ticker: yahooSymbol,
      normalizedSymbol: yahooSymbol,
      requestUrl: url,
      errorKind: e.kind ?? 'network_timeout',
      message: uiMessage,
      rawMessage: e.rawMessage ?? uiMessage,
    });
    throw new MarketDataError(e.kind ?? 'network_timeout', uiMessage, {
      rawMessage: e.rawMessage,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
      normalizedSymbol: yahooSymbol,
    });
  }

  const { response, bodyText, contentType } = httpResult;

  if (!response.ok) {
    const err = classifyProviderHttpError(response.status, bodyText, contentType);
    const uiMessage = sanitizeErrorForUi(err.message, err.message);
    onAttempt?.({
      yahooSymbol,
      requestUrl: url,
      httpStatus: response.status,
      ok: false,
      errorMessage: uiMessage,
    });
    logQuoteFetchFailure({
      provider: 'yahoo_finance',
      ticker: yahooSymbol,
      normalizedSymbol: yahooSymbol,
      requestUrl: url,
      httpStatus: response.status,
      errorKind: err.kind,
      message: uiMessage,
      rawMessage: uiMessage,
      responseBody: bodyText,
    });
    throw new MarketDataError(err.kind, uiMessage, {
      httpStatus: err.httpStatus,
      rawMessage: uiMessage,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
      normalizedSymbol: yahooSymbol,
      responseBody: bodyText.slice(0, 800),
    });
  }

  if (isHtmlResponse(contentType, bodyText)) {
    const err = classifyProviderHttpError(response.status, bodyText, contentType);
    const uiMessage = sanitizeErrorForUi(err.message, err.message);
    onAttempt?.({
      yahooSymbol,
      requestUrl: url,
      httpStatus: response.status,
      ok: false,
      errorMessage: uiMessage,
    });
    throw new MarketDataError(err.kind, uiMessage, {
      httpStatus: response.status,
      rawMessage: uiMessage,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
      normalizedSymbol: yahooSymbol,
      responseBody: bodyText.slice(0, 800),
    });
  }

  const jsonContentType = contentType.toLowerCase();
  if (
    jsonContentType &&
    !jsonContentType.includes('json') &&
    !jsonContentType.includes('text/plain')
  ) {
    const msg = `想定外の content-type: ${contentType}`;
    throw new MarketDataError('empty_response', msg, {
      rawMessage: msg,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
      normalizedSymbol: yahooSymbol,
    });
  }

  let data: YahooChartJson;
  try {
    data = JSON.parse(bodyText) as YahooChartJson;
  } catch {
    onAttempt?.({
      yahooSymbol,
      requestUrl: url,
      httpStatus: response.status,
      ok: false,
      errorMessage: YAHOO_CHART_PARSE_FAILED_MESSAGE,
    });
    throw new MarketDataError('empty_response', YAHOO_CHART_PARSE_FAILED_MESSAGE, {
      rawMessage: YAHOO_CHART_PARSE_FAILED_MESSAGE,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
      responseBody: bodyText.slice(0, 800),
    });
  }

  const parsed = parseYahooPrice(data);
  const price = normalizeQuotePrice(parsed);
  logYahooCloseArrayFor4707(yahooSymbol, data, price);

  if (price == null) {
    onAttempt?.({
      yahooSymbol,
      requestUrl: url,
      httpStatus: response.status,
      ok: false,
      errorMessage: YAHOO_CHART_PARSE_FAILED_MESSAGE,
    });
    throw new MarketDataError('empty_response', YAHOO_CHART_PARSE_FAILED_MESSAGE, {
      rawMessage: YAHOO_CHART_PARSE_FAILED_MESSAGE,
      lastProvider: 'yahoo_finance',
      requestUrl: url,
    });
  }

  const meta = getYahooChartResult(data)?.meta;
  const dt =
    meta?.regularMarketTime != null
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : undefined;

  onAttempt?.({
    yahooSymbol,
    requestUrl: url,
    httpStatus: response.status,
    ok: true,
    price,
  });

  return {
    symbol: meta?.symbol ?? yahooSymbol,
    exchange: '',
    currency,
    price,
    datetime: dt,
    isDelayed: true,
    provider: 'yahoo_finance',
    companyName: parseYahooCompanyName(data),
  };
}
