import type { Currency } from '../../types';
import type { ProviderQuote } from '../../types/quoteProvider';
import { isValidQuotePrice } from '../../utils/safeNumeric';
import {
  classifyProviderHttpError,
  fetchWithTimeout,
  ProviderSkippedError,
  readEnvKey,
} from './providerFetchUtil';

export function getRapidApiConfig(): { key: string; host: string } {
  const key = readEnvKey('EXPO_PUBLIC_RAPIDAPI_KEY', 'RAPIDAPI_KEY');
  const host =
    readEnvKey('EXPO_PUBLIC_RAPIDAPI_YAHOO_HOST') || 'yahoo-finance15.p.rapidapi.com';
  return { key, host };
}

export async function fetchRapidApiYahooQuote(
  yahooSymbol: string,
  currency: Currency,
  timeoutMs?: number,
): Promise<ProviderQuote> {
  const { key, host } = getRapidApiConfig();
  if (!key) {
    throw new ProviderSkippedError('rapidapi_yahoo', 'RapidAPI キー未設定');
  }

  const url = new URL(`https://${host}/api/v1/markets/quote`);
  url.searchParams.set('ticker', yahooSymbol);

  console.log('[quote-provider:rapidapi_yahoo] REQUEST_URL', {
    yahooSymbol,
    url: url.toString(),
    host,
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), {
      timeoutMs,
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
        Accept: 'application/json',
      },
    });
  } catch (err) {
    console.log('[quote-provider:rapidapi_yahoo] RESPONSE', { yahooSymbol, error: err });
    throw err;
  }

  const bodyText = await response.text();
  console.log('[quote-provider:rapidapi_yahoo] RESPONSE', {
    yahooSymbol,
    httpStatus: response.status,
    responseBodyFull: bodyText,
  });

  if (!response.ok) {
    throw classifyProviderHttpError(response.status, bodyText);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    throw {
      kind: 'empty_response' as const,
      message: 'JSON解析失敗',
      rawMessage: bodyText.slice(0, 200),
    };
  }

  const body = (data.body ?? data) as Record<string, unknown>;
  const price =
    Number(body.regularMarketPrice) ||
    Number(body.price) ||
    Number((body as { primaryData?: { lastSalePrice?: string } }).primaryData?.lastSalePrice);

  if (!isValidQuotePrice(price)) {
    throw {
      kind: 'empty_response' as const,
      message: 'RapidAPI Yahoo price missing',
      rawMessage: bodyText.slice(0, 300),
    };
  }

  return {
    symbol: String(body.symbol ?? yahooSymbol),
    exchange: '',
    currency,
    price,
    isDelayed: true,
    provider: 'rapidapi_yahoo',
  };
}
