import type { Currency } from '../../types';
import type { ProviderQuote } from '../../types/quoteProvider';
import { isValidQuotePrice } from '../../utils/safeNumeric';
import {
  classifyProviderHttpError,
  fetchWithTimeout,
  ProviderSkippedError,
  readEnvKey,
} from './providerFetchUtil';

type AvGlobalQuote = {
  'Global Quote'?: Record<string, string>;
  Note?: string;
  Information?: string;
  'Error Message'?: string;
};

export function getAlphaVantageApiKey(): string {
  return readEnvKey('EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY', 'ALPHA_VANTAGE_API_KEY');
}

export async function fetchAlphaVantageQuote(
  yahooSymbol: string,
  currency: Currency,
  timeoutMs?: number,
): Promise<ProviderQuote> {
  const apiKey = getAlphaVantageApiKey();
  if (!apiKey) {
    throw new ProviderSkippedError('alpha_vantage', 'Alpha Vantage APIキー未設定');
  }

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GLOBAL_QUOTE');
  url.searchParams.set('symbol', yahooSymbol);
  url.searchParams.set('apikey', apiKey);

  console.log('[quote-provider:alpha_vantage] REQUEST_URL', {
    yahooSymbol,
    url: url.toString().replace(apiKey, '***'),
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), { timeoutMs });
  } catch (err) {
    console.log('[quote-provider:alpha_vantage] RESPONSE', { yahooSymbol, error: err });
    throw err;
  }

  const bodyText = await response.text();
  console.log('[quote-provider:alpha_vantage] RESPONSE', {
    yahooSymbol,
    httpStatus: response.status,
    responseBodyFull: bodyText,
  });

  if (!response.ok) {
    throw classifyProviderHttpError(response.status, bodyText);
  }

  let data: AvGlobalQuote;
  try {
    data = JSON.parse(bodyText) as AvGlobalQuote;
  } catch {
    throw {
      kind: 'empty_response' as const,
      message: 'JSON解析失敗',
      rawMessage: bodyText.slice(0, 200),
    };
  }

  if (data.Note || data.Information) {
    const msg = data.Note ?? data.Information ?? 'rate limit';
    const rateLimited = /rate|limit|frequency|calls/i.test(msg);
    throw {
      kind: rateLimited ? ('rate_limit' as const) : ('unknown' as const),
      message: msg,
      rawMessage: msg,
      rateLimited,
    };
  }

  if (data['Error Message']) {
    throw {
      kind: 'symbol_invalid' as const,
      message: data['Error Message'],
      rawMessage: data['Error Message'],
    };
  }

  const gq = data['Global Quote'];
  const price = gq ? Number(gq['05. price']) : NaN;
  if (!isValidQuotePrice(price)) {
    throw {
      kind: 'empty_response' as const,
      message: 'Alpha Vantage price missing',
      rawMessage: bodyText.slice(0, 300),
    };
  }

  return {
    symbol: gq?.['01. symbol'] ?? yahooSymbol,
    exchange: '',
    currency,
    price,
    datetime: undefined,
    isDelayed: true,
    provider: 'alpha_vantage',
  };
}
