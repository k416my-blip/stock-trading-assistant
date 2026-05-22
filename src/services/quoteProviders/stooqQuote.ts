import type { Currency } from '../../types';
import type { ProviderQuote } from '../../types/quoteProvider';
import { isValidQuotePrice } from '../../utils/safeNumeric';
import { fetchWithTimeout } from './providerFetchUtil';

/** Yahoo 1023.KL → Stooq 1023.my */
export function toStooqSymbol(yahooSymbol: string): string {
  const upper = yahooSymbol.trim().toUpperCase();
  if (upper.endsWith('.KL')) {
    return `${upper.replace(/\.KL$/i, '')}.my`.toLowerCase();
  }
  if (upper.endsWith('.HK')) {
    return `${upper.replace(/\.HK$/i, '')}.hk`.toLowerCase();
  }
  return upper.toLowerCase();
}

export function buildStooqUrl(stooqSymbol: string): string {
  return `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
}

export async function fetchStooqQuote(
  yahooSymbol: string,
  currency: Currency,
  timeoutMs?: number,
): Promise<ProviderQuote> {
  const stooqSymbol = toStooqSymbol(yahooSymbol);
  const url = buildStooqUrl(stooqSymbol);
  console.log('[quote-provider:stooq] REQUEST_URL', { yahooSymbol, stooqSymbol, url });

  let response: Response;
  try {
    response = await fetchWithTimeout(url, { timeoutMs });
  } catch (err) {
    console.log('[quote-provider:stooq] RESPONSE', { yahooSymbol, error: err });
    throw err;
  }

  const bodyText = await response.text();
  console.log('[quote-provider:stooq] RESPONSE', {
    yahooSymbol,
    stooqSymbol,
    httpStatus: response.status,
    responseBodyFull: bodyText,
  });

  if (!response.ok || bodyText.includes('Exceeded') || bodyText.includes('No data')) {
    throw {
      kind: 'empty_response' as const,
      message: 'Stooq データなし',
      rawMessage: bodyText.slice(0, 300),
      httpStatus: response.status,
    };
  }

  const lines = bodyText.trim().split('\n');
  if (lines.length < 2) {
    throw {
      kind: 'empty_response' as const,
      message: 'Stooq CSV 行不足',
      rawMessage: bodyText.slice(0, 200),
    };
  }

  const headers = lines[0].split(',');
  const values = lines[1].split(',');
  const closeIdx = headers.findIndex((h) => h.toLowerCase() === 'close');
  const price = closeIdx >= 0 ? Number(values[closeIdx]) : Number(values[values.length - 1]);
  if (!isValidQuotePrice(price)) {
    throw {
      kind: 'empty_response' as const,
      message: 'Stooq close price invalid',
      rawMessage: bodyText.slice(0, 200),
    };
  }

  return {
    symbol: yahooSymbol,
    exchange: '',
    currency,
    price,
    isDelayed: true,
    provider: 'stooq',
  };
}
